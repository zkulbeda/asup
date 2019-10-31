
#include <SPI.h>
#include <MFRC522.h>
#include <arduino.h>

#define _TASK_STATUS_REQUEST

#include <TaskScheduler.h>
#include <TaskSchedulerDeclarations.h>

#include <ESP8266WiFi.h>
#include <ESP8266WebServer.h>
#include <WiFiClient.h>
#include <ESP8266SSDP.h>
#include <ArduinoJson.h>

IPAddress local_IP(192,168,100,1);
IPAddress gateway(192,168,100,1);
IPAddress subnet(255,255,0,0);

#include <ArduinoWebsockets.h>

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
#define WS_COMMAND_READ 1
#define WS_COMMAND_WRITE 2

#define RST_PIN         D3           // Configurable, see typical pin layout above
#define SS_PIN          D4          // Configurable, see typical pin layout above

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

Task ServersTask(0,TASK_FOREVER, &server_listen_callback, &ts, true, &server_listen_init, NULL);


StatusRequest waiting;


bool clientSet = false;
#define SCANING_MODE 1
#define RECORD_MODE 2
short int mode = SCANING_MODE;


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

StaticJsonDocument<200> command_data;

void rfid_scan_callback();
bool rfid_scan_enable();
void rfid_scan_disable();

Task RFIDScanTask(0, TASK_FOREVER, &rfid_scan_callback, &ts, false, &rfid_scan_enable, &rfid_scan_disable);

void onMessage(websockets::WebsocketsClient& client, websockets::WebsocketsMessage message) {
  StaticJsonDocument<200> doc;
  DeserializationError err = deserializeJson(doc, message.data());
  if(err != DeserializationError::Ok){
    ws_log("DeserializationError");
    return;
  }
  switch(doc["type"].as<int>()){
    case WS_TYPE_RESPONSE:
      waiting.signalComplete();
      if(doc["has_command"] == false){
        break;
      }
    case WS_TYPE_COMMAND:
      StaticJsonDocument<200> command;
      if(doc["has_command"] == false){
        command = doc["command"];
      }else{
        command = doc;
      }
      RFIDScanTask.disable();
      switch(command["type"].as<int>()){
        case WS_COMMAND_READ:
          RFIDScanTask.enable();
          command_data = command["sectors"];          
          break;
        case WS_COMMAND_WRITE:
          command_data = command["sectors"];
          break;
      }
      break;
  }
  Serial.println("Got Message: `" + message.data() + "`");
}


bool blink_enable();
void blinkRed();

Task Blink(500, TASK_FOREVER, &blinkRed, &ts, true, &blink_enable);
bool blink_enable(){ 
  return true;
}

void blinkBlue(){
  analogWrite(D0, 255);
  analogWrite(D1, 0);
  analogWrite(D2, 0);
  Blink.setCallback(&blinkRed);
};

void blinkRed(){
  analogWrite(D0, 0);
  analogWrite(D1, 255);
  analogWrite(D2, 0);
  Blink.setCallback(&blinkBlue);
}
void set_busy_state(){
  analogWrite(D0, 0);
  analogWrite(D1, 255);
  analogWrite(D2, 255);
}

//Task error_timeout(0, TASK_ONCE, &set_error_atate)

void onEvent(websockets::WebsocketsEvent event, String payload) {
  switch(event) {
    case websockets::WebsocketsEvent::ConnectionOpened:
      Serial.println("Client connected");
      break;
    case websockets::WebsocketsEvent::GotPing:
      Serial.println("ping");
      break;
    case websockets::WebsocketsEvent::GotPong:
      Serial.println("pong");
      break;
    case websockets::WebsocketsEvent::ConnectionClosed:
      Serial.println("Client disconnected");
      Serial.println(payload);
      RFIDScanTask.disable();
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
  return true;}
void rfid_scan_disable(){}

void rfid_scan_callback(){
    ShowReaderDetails();
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
    Serial.println();
    Serial.print(F("PICC type: "));
    MFRC522::PICC_Type piccType = mfrc522.PICC_GetType(mfrc522.uid.sak);
    Serial.println(mfrc522.PICC_GetTypeName(piccType));

    // Check for compatibility
    if (    piccType != MFRC522::PICC_TYPE_MIFARE_MINI
        &&  piccType != MFRC522::PICC_TYPE_MIFARE_1K
        &&  piccType != MFRC522::PICC_TYPE_MIFARE_4K) {
        ws_log(F("This sample only works with MIFARE Classic cards."));
        return;
    }
    set_busy_state();

    
    StaticJsonDocument<300> data_to_send;
    JsonObject data_object = data_to_send.as<JsonObject>();

    JsonArray data = command_data.as<JsonArray>();
    for(JsonVariant v : data) {
      byte sector = v["sector"].as<byte>();
      String kk; kk+=sector;
      JsonObject sector_data = data_object.createNestedObject(kk);
      byte trailerBlock = (sector-1)*4+3;
      MFRC522::MIFARE_Key key;
      for (byte i = 0; i < 6; i++) {
          key.keyByte[i] = v["key"][i].as<byte>();
      }
      byte key_type = 0;
      if(v["key_type"]=="B"){
        key_type = MFRC522::PICC_CMD_MF_AUTH_KEY_B;
      }else{ 
        key_type = MFRC522::PICC_CMD_MF_AUTH_KEY_A;
      }
      MFRC522::StatusCode status = (MFRC522::StatusCode) mfrc522.PCD_Authenticate(key_type, trailerBlock, &key, &(mfrc522.uid));
      if (status != MFRC522::STATUS_OK) {
          Serial.print(F("PCD_Authenticate() failed: "));
          Serial.println(mfrc522.GetStatusCodeName(status));
          return;
      }
      JsonArray blocks = v.as<JsonArray>();
      byte buffer[18];
      byte size = sizeof(buffer);
      for(JsonVariant block: blocks){
        JsonArray block_data = sector_data.createNestedArray(block.as<String>());
        byte block_id = (sector-1)*4+(block.as<byte>()-1);
        status = (MFRC522::StatusCode) mfrc522.MIFARE_Read(block_id, buffer, &size);
        if (status != MFRC522::STATUS_OK) {
            Serial.print(F("MIFARE_Read() failed: "));
            Serial.println(mfrc522.GetStatusCodeName(status));
        } 
        for(int i = 0; i<18; i++){
          block_data.add(buffer[i]);
        }
      }
    }
    String response;
    serializeJson(data_to_send, response);
    ws.send(response);
      


    // In this sample we use the second sector,
    // that is: sector #1, covering block #4 up to and including block #7
    byte sector         = 1;
    byte blockAddr      = 6;
    byte dataBlock[]    = {
        0x01, 0x02, 0x03, 0x04, //  1,  2,   3,  4,
        0x05, 0x06, 0x07, 0x08, //  5,  6,   7,  8,
        0x09, 0x0a, 0xff, 0x0b, //  9, 10, 255, 11,
        0x0c, 0x0d, 0x0e, 0x0f  // 12, 13, 14, 15
    };
    byte trailerBlock   = 7;
    MFRC522::StatusCode status;
    byte buffer[18];
    byte size = sizeof(buffer);

    // Authenticate using key A
    //Serial.println(F("Authenticating using key A..."));
    status = (MFRC522::StatusCode) mfrc522.PCD_Authenticate(MFRC522::PICC_CMD_MF_AUTH_KEY_A, trailerBlock, &key, &(mfrc522.uid));
    if (status != MFRC522::STATUS_OK) {
        Serial.print(F("PCD_Authenticate() failed: "));
        Serial.println(mfrc522.GetStatusCodeName(status));
        return;
    }

    // Read data from the block
    //Serial.print(F("Reading data from block ")); Serial.print(blockAddr);
    //Serial.println(F(" ..."));
    status = (MFRC522::StatusCode) mfrc522.MIFARE_Read(blockAddr, buffer, &size);
    if (status != MFRC522::STATUS_OK) {
        Serial.print(F("MIFARE_Read() failed: "));
        Serial.println(mfrc522.GetStatusCodeName(status));
    }
    //Serial.print(F("Data in block ")); Serial.print(blockAddr); Serial.println(F(":"));
    //dump_byte_array(buffer, 16); Serial.println();
    //Serial.println();

    
    //Serial.println(F("Authenticating again using key B..."));
    status = (MFRC522::StatusCode) mfrc522.PCD_Authenticate(MFRC522::PICC_CMD_MF_AUTH_KEY_B, trailerBlock, &key, &(mfrc522.uid));
    if (status != MFRC522::STATUS_OK) {
        Serial.print(F("PCD_Authenticate() failed: "));
        Serial.println(mfrc522.GetStatusCodeName(status));
        return;
    }

    buffer[0]++;
    
    status = (MFRC522::StatusCode) mfrc522.MIFARE_Write(blockAddr, buffer, 16);
    if (status != MFRC522::STATUS_OK) {
        Serial.print(F("MIFARE_Write() failed: "));
        Serial.println(mfrc522.GetStatusCodeName(status));
    }
    
    Serial.println(buffer[0]);
    Serial.println("Ok");

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
    for (byte i = 0; i < bufferSize; i++) {
        Serial.print(buffer[i] < 0x10 ? " 0" : " ");
        Serial.print(buffer[i], HEX);
    }
}
