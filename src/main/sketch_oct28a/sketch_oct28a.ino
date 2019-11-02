#include<arduino.h>


#include <SPI.h>
#include <MFRC522.h>

#define _TASK_STATUS_REQUEST
#define _TASK_TIMEOUT

#include <TaskScheduler.h>
#include <TaskSchedulerDeclarations.h>

#include <ESP8266WiFi.h>
#include <ESP8266WebServer.h>
#include <WiFiClient.h>
#include <ESP8266SSDP.h>
#include <ArduinoJson.h>
#include <ArduinoWebsockets.h>
#include <vector>

IPAddress local_IP(192,168,100,1);
IPAddress gateway(192,168,100,1);
IPAddress subnet(255,255,0,0);


#define LED_BUILTIN 2

static const uint8_t D0   = 16;
static const uint8_t D1   = 5;
static const uint8_t D2   = 4;
static const uint8_t D3   = 0;
static const uint8_t D4   = 2;
static const uint8_t D5   = 14;
static const uint8_t D6   = 12;
static const uint8_t D7   = 13;
static const uint8_t D8   = 15;
static const uint8_t RX   = 3;
static const uint8_t TX   = 1;

#define WS_TYPE_RESPONSE 1
#define WS_TYPE_COMMAND 2
#define WS_TYPE_LOG 3
#define WS_COMMAND_READ 1
#define WS_COMMAND_WRITE 2
#define WS_COMMAND_CONTINUE 3
#define WS_KEY_TYPE_A 1
#define WS_KEY_TYPE_B 2
#define WS_OK_RESPONSE 1
#define WS_ERROR_RESPONSE 0
#define WS_NONE_RESPONSE 2
#define WS_KEY_A 1
#define WS_KEY_B 2
#define WS_WRITE_TYPE_ALL 1
#define WS_WRITE_TYPE_INC 2
#define WS_WRITE_TYPE_DEC 3

#define RST_PIN         D3           // Configurable, see typical pin layout above
#define SS_PIN          D4          // Configurable, see typical pin layout above

#define DEBUG 0

void wln(String a){
  if(!DEBUG) return;
  Serial.println(a);
}
void w(String a){
  if(!DEBUG) return;
  Serial.print(a);
}

void wln(byte a){
  if(!DEBUG) return;
  Serial.println(a);
}
void w(byte a){
  if(!DEBUG) return;
  Serial.print(a);
}

void wln(){
  if(DEBUG) return;
  Serial.println();
}

MFRC522 mfrc522(SS_PIN, RST_PIN);   // Create MFRC522 instance.

MFRC522::MIFARE_Key key;

#define APMode false;
#ifndef APSSID
#define APSSID "NodeMCU"
#define APPSK  "12345678"
#endif

ESP8266WebServer server(57300);
ESP8266WebServer HTTP(80);
websockets::WebsocketsClient ws;

Scheduler ts; 

void handleRoot();
void handlePing();
void handleConnect();
void ws_log();

void set_color_state(byte r, byte g, byte b){
  analogWrite(D1, r);
  analogWrite(D2, g);
  analogWrite(D0, b);
}

void onMessage(websockets::WebsocketsClient& client, websockets::WebsocketsMessage message);
void onEvent(websockets::WebsocketsEvent event, String payload);

bool server_listen_init(){
    Serial.printf("Starting HTTP...\n");
    HTTP.on("/index.html", HTTP_GET, []() {
      HTTP.send(200, "text/plain", "Hello World!");
    });
    HTTP.on("/description.xml", HTTP_GET, []() {
      SSDP.schema(HTTP.client());
    });
    HTTP.begin();

    Serial.printf("Starting SSDP...\n");
    SSDP.setDeviceType("urn:rfid-lunch:device:rfid-scanner:1.0");
    SSDP.setSchemaURL("description.xml");
    SSDP.setHTTPPort(80);
    SSDP.setName("RFID-scanner");
    SSDP.setURL("index.html");
    SSDP.setModelName("RFID-scanner");
    SSDP.setManufacturer("esp8266");
    SSDP.setManufacturerURL("http://example.com/");
    SSDP.begin();
    
    server.on("/", handleRoot);
    server.on("/rfid", handlePing);
    server.on("/connect", handleConnect);
    server.begin();
    Serial.println("HTTP server started");
    ws.onMessage(onMessage);
    ws.onEvent(onEvent);
    return true;
 }

 void server_listen_callback(){
    server.handleClient();
    HTTP.handleClient();
    if(ws.available()){
      ws.poll();      
    }
}

Task ServersTask(0,TASK_FOREVER, &server_listen_callback, &ts, false, &server_listen_init, NULL);


StatusRequest waiting;


bool clientSet = false;
#define NONE_MODE 0
#define SCANING_MODE 1
#define RECORD_MODE 2
short int mode = NONE_MODE;


void handleRoot() {
  server.send(200, "text/html", "<h1>You are connected</h1>");
}
void handlePing() {
  server.send(200, "text/html", "yes");
}

void handleConnect(){
  String ip = server.client().remoteIP().toString();
  server.send(200, "text/html", "ok");
  Serial.println("Connect request");
  ws.connect("ws://"+ip+":57301/");
}

struct ReadingSector{
  byte sector;
  std::vector<byte> blocks;
  MFRC522::MIFARE_Key key;
  char key_type;
};

struct WritingBlock{
  byte block_id;
  byte type;
  std::vector<byte> data;
};

struct WritingSector{
  byte sector;
  std::vector<WritingBlock> blocks;
  MFRC522::MIFARE_Key key;
  char key_type;
};

std::vector<ReadingSector> data_to_read;
std::vector<WritingSector> data_to_write;

void rfid_scan_callback();
bool rfid_scan_enable();
void rfid_scan_disable();

#define DELAY_TASK DEBUG?500:0

Task RFIDScanTask(DELAY_TASK, TASK_FOREVER, &rfid_scan_callback, &ts, false, &rfid_scan_enable, &rfid_scan_disable);
Task RFIDWriteTask(DELAY_TASK, TASK_FOREVER, &rfid_write_callback, &ts, false, &rfid_scan_enable, &rfid_scan_disable);
bool server_response_ok_on();
bool server_response_error_on();
void server_response_off();
Task ServerResponseOK(2000, TASK_FOREVER, &server_response_off, &ts, false, &server_response_ok_on, &server_response_disable);
Task ServerResponseError(4000, TASK_ONCE, &server_response_off, &ts, false, &server_response_error_on, &server_response_disable);

void start_command();
bool server_response_ok_on(){
  set_color_state(0,255,0);
  //Serial.println("onnn");
  return true;
}
bool server_response_error_on(){
  set_color_state(255,0,0);
  return true;
}
void server_response_off(){
  ServerResponseOK.disable();
  set_busy_state();
  //Serial.println("OFFF");
  waiting.signalComplete();
}
void server_response_disable(){
  //Serial.println("disssssss");  
}

void start_command(){
    switch(mode){
      case SCANING_MODE:
        RFIDScanTask.enable();
        break;
      case RECORD_MODE:
        RFIDWriteTask.enable();
        break;
    }
}

byte card_status = WS_NONE_RESPONSE;

void clear_last_card_id();
bool cleaner_enable();
void cleaner_disable();

Task LastCardCleaner(2000, TASK_FOREVER, &clear_last_card_id, &ts, false, &cleaner_enable, cleaner_disable);

bool cleaner_enable(){
  switch(card_status){
    case WS_OK_RESPONSE:
      set_color_state(0,255,0);
      break;
    case WS_ERROR_RESPONSE:
      set_color_state(255,0,0);
      break;
    case WS_NONE_RESPONSE:
      set_color_state(255,255,0);
      break;
  }
  LastCardCleaner.setOnEnable(NULL);
  return true;
}

void cleaner_disable(){
  LastCardCleaner.setOnEnable(&cleaner_enable);
}

void onMessage(websockets::WebsocketsClient& client, websockets::WebsocketsMessage message) {
  DynamicJsonDocument doc(5000);
  DeserializationError err = deserializeJson(doc, message.data());
  if(err != DeserializationError::Ok){
    ws_log("DeserializationError");
    ws_log(err.c_str());
    ws_log(message.data());
    return;
  }
  wln(doc["type"].as<byte>());
  switch(doc["type"].as<byte>()){
    case WS_TYPE_RESPONSE:
      //Serial.println("response");
      waiting.setWaiting();
      card_status = doc["status"];
      wln((byte)doc["status"]);
      if(card_status != WS_NONE_RESPONSE){
        LastCardCleaner.enableDelayed();
      }else{
        wln("sdfdsfdsfsdf");
        clear_last_card_id();
      }
//      if(doc["status"] == WS_OK_RESPONSE){
//        ServerResponseOK.enableDelayed();
//      }else{
//        ServerResponseError.enableDelayed();
//      }
      if(doc["has_command"] == false){
        mode = NONE_MODE;
        RFIDScanTask.disable();
        RFIDWriteTask.disable();
        break;
      }
      else if(doc["command"]==WS_COMMAND_CONTINUE){
        start_command();
        break;
      }
    case WS_TYPE_COMMAND:{
        //Serial.println("command");
        RFIDScanTask.disable();
        RFIDWriteTask.disable();
        //Serial.println(doc["command"].as<int>());
        switch(doc["command"].as<byte>()){
          case WS_COMMAND_READ: {
              data_to_read.clear();
              //Serial.println("command_read");
              JsonArray sectors = doc["sectors"];
              for (JsonArray::iterator it=sectors.begin(); it!=sectors.end(); ++it) {
                ReadingSector tmp;
                tmp.sector = (*it)["sector"].as<byte>()-1;
                JsonArray block = (*it)["blocks"];
                for (JsonArray::iterator itt=block.begin(); itt!=block.end(); ++itt) {
                  tmp.blocks.push_back(itt->as<byte>()-1);
                  wln("block "+(itt->as<byte>()));
                }
                JsonArray key = (*it)["key"];
                byte i = 0;
                for(JsonArray::iterator itt=key.begin(); itt!=key.end() && i<6; ++itt){
                  tmp.key.keyByte[i] = itt->as<byte>();
                  i++;
                }
                tmp.key_type = (*it)["key_type"].as<byte>();
                data_to_read.push_back(tmp);
              }
              mode = SCANING_MODE;
              start_command(); 
            }
            break;
          case WS_COMMAND_WRITE: {
              data_to_write.clear();
              //Serial.println("command_read");
              JsonArray sectors = doc["sectors"];
              for (JsonArray::iterator it=sectors.begin(); it!=sectors.end(); ++it) {
                WritingSector tmp;
                tmp.sector = (*it)["sector"].as<byte>()-1;
                JsonArray blocks = (*it)["blocks"];
                for (JsonArray::iterator itt=blocks.begin(); itt!=blocks.end(); ++itt) {
                    JsonObject block = *itt;
                    WritingBlock tmpblock;
                    tmpblock.block_id = block["block"].as<byte>()-1;
                    tmpblock.type = block["type"].as<byte>();
                    JsonArray data = block["data"];
                    for (JsonArray::iterator ittt=data.begin(); ittt!=data.end(); ++ittt) {
                      tmpblock.data.push_back(ittt->as<byte>());
                      w("data "); wln(ittt->as<String>());
                    }
                    tmp.blocks.push_back(tmpblock);
                  }
                JsonArray key = (*it)["key"];
                byte i = 0;
                for(JsonArray::iterator it=key.begin(); it!=key.end() && i<6; ++it){
                  tmp.key.keyByte[i] = it->as<byte>();
                  i++;
                }
                tmp.key_type = (*it)["key_type"].as<byte>();
                data_to_write.push_back(tmp);
              }
              mode = RECORD_MODE;
              start_command();
              //command_data = command["sectors"];
            }
            break;
        }
      }
      break;
  }
//  for(ReadingSector i: data_to_read){
//   w("sector "); wln((String)i.sector);
//   w("blocks ");
//   for(byte b: i.blocks){
//    w((String)b); w(" ");
//   }wln("");
//   w("key ");
//   for(byte b: i.key.keyByte){
//    w((String)b); w(" ");
//   }wln("");
//   w("type "); wln((String)i.key_type);
//   wln("");
//  }
  //Serial.println("Got Message: `" + message.data() + "`");
}

void set_busy_state(){
  set_color_state(255, 255,0);
}
void set_ready_state(){
  set_color_state(0, 0, 255);
}

//Task error_timeout(0, TASK_ONCE, &set_error_atate)
bool blink_enable();
void blinkRed();

Task BlinkConnecting(500, TASK_FOREVER, &blinkRed, &ts, true, &blink_enable);
bool blink_enable(){ 
  return true;
}

void blinkBlue(){
  set_color_state(0,0,255);
  BlinkConnecting.setCallback(&blinkRed);
};

void blinkRed(){
  set_color_state(255,0,0);
  BlinkConnecting.setCallback(&blinkBlue);
}

void onEvent(websockets::WebsocketsEvent event, String payload) {
  switch(event) {
    case websockets::WebsocketsEvent::ConnectionOpened:
      Serial.println("Client connected");
      BlinkConnecting.disable();
      RFIDWriteTask.disable();
      set_ready_state();
      break;
    case websockets::WebsocketsEvent::GotPing:
//      Serial.println("ping");
      break;
    case websockets::WebsocketsEvent::GotPong:
      Serial.println("pong");
      break;
    case websockets::WebsocketsEvent::ConnectionClosed:
      Serial.println("Client disconnected");
      Serial.println(payload);
      RFIDScanTask.disable();
      RFIDWriteTask.disable();
      BlinkConnecting.enable();
      // Dispatched when the connection is closed (either 
      // by the user or after some error or event)
      break;
  }
}

void ws_log(String a){
  StaticJsonDocument<200> doc;
  doc["type"] = "log";
  doc["message"] = a;
  String output;
  serializeJson(doc, output);
  ws.send(output);
}

bool rfid_scan_enable(){
  mfrc522.PCD_Init();
  wln("init");
  return true;}
void rfid_scan_disable(){}

std::vector<byte> last_id = {0, 0, 0, 0};

void clear_last_card_id(){
  last_id = {0, 0, 0, 0};
  set_ready_state();
  if(mode == NONE_MODE || card_status==WS_NONE_RESPONSE){
    set_busy_state();
  }else{
    set_ready_state();
  }
  card_status = WS_NONE_RESPONSE;
  wln("clear");
  LastCardCleaner.disable();
}


void rfid_scan_callback(){
    ShowReaderDetails(); wln('.');
    if ( ! mfrc522.PICC_IsNewCardPresent()){
        return;
    }
    // Select one of the cards
    if ( ! mfrc522.PICC_ReadCardSerial()){
        Serial.println("Two or more cards");
        return;
    }

        

    // Show some details of the PICC (that is: the tag/card)
    Serial.print(F("Card UID:"));
    dump_byte_array(mfrc522.uid.uidByte, mfrc522.uid.size);
    bool is_equal = true;
    for(byte i = 0; i<4; i++){
      is_equal = is_equal && last_id[i] == mfrc522.uid.uidByte[i];
    }
    if(is_equal){
      wln("EQUAL___===");
      LastCardCleaner.enableDelayed();
      return;  
    }
    wln();
    wln(F("PICC type: "));
    MFRC522::PICC_Type piccType = mfrc522.PICC_GetType(mfrc522.uid.sak);
    wln(mfrc522.PICC_GetTypeName(piccType));

    // Check for compatibility
    if (    piccType != MFRC522::PICC_TYPE_MIFARE_MINI
        &&  piccType != MFRC522::PICC_TYPE_MIFARE_1K
        &&  piccType != MFRC522::PICC_TYPE_MIFARE_4K) {
        ws_log(F("This sample only works with MIFARE Classic cards."));
        return;
    }
    set_busy_state();

    
    DynamicJsonDocument data_to_send(3000);
    JsonObject data_object = data_to_send.to<JsonObject>();
    data_object["type"] = WS_TYPE_RESPONSE;
    for(ReadingSector v: data_to_read) {
      w("now sector "); wln((String) v.sector);
      byte sector = v.sector;
      JsonObject sector_data = data_object.createNestedObject((String)(sector+1));
      byte trailerBlock = sector*4+3;
      byte key_type = 0;
      //Serial.println(v.key_type=='B');
      if(v.key_type==WS_KEY_B){
        key_type = MFRC522::PICC_CMD_MF_AUTH_KEY_B;
      }else{ 
        key_type = MFRC522::PICC_CMD_MF_AUTH_KEY_A;
      }
      //dump_byte_array(v.key.keyByte, 6); wln("");
      MFRC522::StatusCode status = (MFRC522::StatusCode) mfrc522.PCD_Authenticate(key_type, trailerBlock, &v.key, &(mfrc522.uid));
      if (status != MFRC522::STATUS_OK) {
          Serial.print(F("PCD_Authenticate() failed: "));
          Serial.println(mfrc522.GetStatusCodeName(status));
          return;
      }
      byte buffer[18];
      byte size = sizeof(buffer);
      for(byte block: v.blocks){
        //w("now block "); wln((String) block);
        JsonArray block_data = sector_data.createNestedArray((String)(block+1));
        byte block_id = sector*4+block;
        //w("id block "); wln((String) block_id);
        status = (MFRC522::StatusCode) mfrc522.MIFARE_Read(block_id, buffer, &size);
        if (status != MFRC522::STATUS_OK) {
            Serial.print(F("MIFARE_Read() failed: "));
            Serial.println(mfrc522.GetStatusCodeName(status));
        } 
        for(byte i = 0; i<18; i++){
          block_data.add(buffer[i]);
        }
      }
    }
    String response;
    serializeJson(data_to_send, response);
    for(byte i = 0; i<4; i++){
      last_id[i] = mfrc522.uid.uidByte[i];
    }
    ws.send(response);
    RFIDScanTask.disable();
    // Halt PICC
    mfrc522.PICC_HaltA();
    // Stop encryption on PCD
    mfrc522.PCD_StopCrypto1();
}

void rfid_write_callback(){
    ShowReaderDetails(); wln('.');
    if ( ! mfrc522.PICC_IsNewCardPresent()){
        return;
    }
    // Select one of the cards
    if ( ! mfrc522.PICC_ReadCardSerial()){
        Serial.println("Two or more cards");
        return;
    }

        

    // Show some details of the PICC (that is: the tag/card)
    w(F("Card UID:"));
    dump_byte_array(mfrc522.uid.uidByte, mfrc522.uid.size);
    bool is_equal = true;
    for(byte i = 0; i<4; i++){
      is_equal = is_equal && last_id[i] == mfrc522.uid.uidByte[i];
    }
    if(is_equal){
      wln("EQUAL___===");
      LastCardCleaner.enableDelayed();
      return;  
    }
    wln();
    w(F("PICC type: "));
    MFRC522::PICC_Type piccType = mfrc522.PICC_GetType(mfrc522.uid.sak);
    wln(mfrc522.PICC_GetTypeName(piccType));

    // Check for compatibility
    if (    piccType != MFRC522::PICC_TYPE_MIFARE_MINI
        &&  piccType != MFRC522::PICC_TYPE_MIFARE_1K
        &&  piccType != MFRC522::PICC_TYPE_MIFARE_4K) {
        ws_log(F("This sample only works with MIFARE Classic cards."));
        return;
    }
    set_busy_state();    
    DynamicJsonDocument data_to_send(200);
    JsonObject data_object = data_to_send.to<JsonObject>();
    data_object["type"] = WS_TYPE_RESPONSE;
    bool all_has_been_wrote = true;
    for(WritingSector v: data_to_write) {
      w("now sector "); wln((String) v.sector);
      byte sector = v.sector;
      byte trailerBlock = sector*4+3;
      byte key_type = 0;
      //Serial.println(v.key_type=='B');
      if(v.key_type==WS_KEY_B){
        key_type = MFRC522::PICC_CMD_MF_AUTH_KEY_B;
      }else{ 
        key_type = MFRC522::PICC_CMD_MF_AUTH_KEY_A;
      }
      //dump_byte_array(v.key.keyByte, 6); wln("");
      MFRC522::StatusCode status = (MFRC522::StatusCode) mfrc522.PCD_Authenticate(key_type, trailerBlock, &v.key, &(mfrc522.uid));
      if (status != MFRC522::STATUS_OK) {
          Serial.print(F("PCD_Authenticate() failed: "));
          Serial.println(mfrc522.GetStatusCodeName(status));
          return;
      }
      byte buffer[18];
      byte size = sizeof(buffer);
      for(WritingBlock block: v.blocks){
        for(byte i = 0; i<16; i++){
          buffer[i] = block.data[i];
        }
        dump_byte_array(buffer,16);
        //w("now block "); wln((String) block);
        byte block_id = sector*4+block.block_id;
        status = (MFRC522::StatusCode) mfrc522.MIFARE_Write(block_id, buffer, 16);
        if (status != MFRC522::STATUS_OK) {
            Serial.print(F("MIFARE_Write() failed: "));
            Serial.println(mfrc522.GetStatusCodeName(status));
            all_has_been_wrote = false;
        }
       
      }
    }
    data_to_send["status"] = all_has_been_wrote?WS_OK_RESPONSE:WS_ERROR_RESPONSE;
    String response;
    serializeJson(data_to_send, response);
    for(byte i = 0; i<4; i++){
      last_id[i] = mfrc522.uid.uidByte[i];
    }
    ws.send(response);
    RFIDWriteTask.disable();
    // Halt PICC
    mfrc522.PICC_HaltA();
    // Stop encryption on PCD
    mfrc522.PCD_StopCrypto1();
}

/**
 * Initialize.
 */
void setup() {
    Serial.begin(9600); // Initialize serial communications with the PC
    while (!Serial);    // Do nothing if no serial port is opened (added for Arduinos based on ATMEGA32U4)  
    
    Serial.println();
//    Serial.print("Configuring access point...");
    /* You can remove the password parameter if you want the AP to be open. */
//    WiFi.softAPConfig(local_IP, gateway, subnet);
//    WiFi.softAP(ssid, password);
    WiFi.begin("SH1","01049433");
    Serial.print("Connecting");
    while (WiFi.status() != WL_CONNECTED)
    {
      delay(500);
      Serial.print(".");
    }
    Serial.println();
    IPAddress myIP = WiFi.localIP();
    Serial.print("AP IP address: ");
    Serial.println(myIP);
    SPI.begin();        // Init SPI bus
    mfrc522.PCD_Init(); // Init MFRC522 card
    
    pinMode(D2, OUTPUT);  
    pinMode(D1, OUTPUT);  
    pinMode(D0, OUTPUT); 
    

    // Prepare the key (used both as key A and as key B)
    // using FFFFFFFFFFFFh which is the default at chip delivery from the factory
    for (byte i = 0; i < 6; i++) {
        key.keyByte[i] = 0xFF;
    }

    Serial.println(F("Scan a MIFARE Classic PICC to demonstrate read and write."));
    Serial.print(F("Using key (for A and B):"));
    dump_byte_array(key.keyByte, MFRC522::MF_KEY_SIZE);
    Serial.println();

    Serial.println(F("BEWARE: Data will be written to the PICC, in sector #1"));
    ServersTask.enable();
    waiting.signalComplete();
}

void ShowReaderDetails() {
  // Get the MFRC522 software version
  byte v = mfrc522.PCD_ReadRegister(mfrc522.VersionReg);
 // Serial.print(F("MFRC522 Software Version: 0x"));
//  Serial.print(v, HEX);
/*  if (v == 0x91)
    Serial.print(F(" = v1.0"));               ** I commented this portion out to clean up serial output **
  else if (v == 0x92)
    Serial.print(F(" = v2.0"));
  else
    Serial.print(F(" (unknown),probably a chinese clone?"));
  Serial.println("");
*/  // When 0x00 or 0xFF is returned, communication probably failed
if ((v == 0x00) || (v == 0xFF)) {
    Serial.println(F("WARNING: Communication failure, is the MFRC522 properly connected?"));   // Warning user that MFRC522 isn't connected properly
    Serial.println(F("SYSTEM HALTED: Check connections."));                                    // Telling user to check connections
    while (true); // do not go further
  }
}

void activateRec(MFRC522 mfrc522) {
  mfrc522.PCD_WriteRegister(mfrc522.FIFODataReg, mfrc522.PICC_CMD_REQA);
  mfrc522.PCD_WriteRegister(mfrc522.CommandReg, mfrc522.PCD_Transceive);
  mfrc522.PCD_WriteRegister(mfrc522.BitFramingReg, 0x87);
}

/**
 * Main loop.
 */
void loop() {
  ts.execute();
}

/**
 * Helper routine to dump a byte array as hex values to Serial.
 */
void dump_byte_array(byte *buffer, byte bufferSize) {
    if(!DEBUG) return;
    for (byte i = 0; i < bufferSize; i++) {
        Serial.print(buffer[i] < 0x10 ? " 0" : " ");
        Serial.print(buffer[i], HEX);
    }
}
