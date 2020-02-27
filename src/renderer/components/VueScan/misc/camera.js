import {adapterFactory} from "webrtc-adapter/src/js/adapter_factory.js";
import { StreamApiNotSupportedError } from "./errors.js";
import { hasFired } from "./promisify.js";

class Camera {
  constructor(videoEl, stream) {
    this.videoEl = videoEl;
    this.stream = stream;
    this.canvas = document.createElement("canvas");
    this.canvasCtx = this.canvas.getContext("2d");
    this.canvas.height = videoEl.videoHeight;
    this.canvas.width = videoEl.videoWidth;
  }

  stop() {
    this.stream.getTracks().forEach(track => track.stop());
  }

  captureFrame() {
    this.canvasCtx.drawImage(this.videoEl, 0, 0, this.canvas.width, this.canvas.height);
    return this.canvasCtx.getImageData(0, 0, this.canvas.width, this.canvas.height);
  }
}

const STREAM_API_SUPPORTED =
  navigator &&
  (navigator.getUserMedia ||
    (navigator.mediaDevices && navigator.mediaDevices.getUserMedia));

let streamApiShimApplied = false;

export default async function(constraints, videoEl) {
  if (STREAM_API_SUPPORTED === false) {
    throw new StreamApiNotSupportedError();
  }

  if (streamApiShimApplied === false) {
    adapterFactory({ window });
    streamApiShimApplied = true;
  }
  console.log(constraints);
  const stream = await navigator.mediaDevices.getUserMedia(constraints);
  console.log(stream);
  const streamLoaded = hasFired(videoEl, "loadeddata", "error");
  console.log(videoEl.srcObject);
  if (videoEl.srcObject !== undefined) {
    videoEl.srcObject = stream;
  } else if (videoEl.mozSrcObject !== undefined) {
    videoEl.mozSrcObject = stream;
  } else if (window.URL.createObjectURL) {
    videoEl.src = window.URL.createObjectURL(stream);
  } else if (window.webkitURL) {
    videoEl.src = window.webkitURL.createObjectURL(stream);
  } else {
    videoEl.src = stream;
  }

  await streamLoaded;

  return new Camera(videoEl, stream);
}
