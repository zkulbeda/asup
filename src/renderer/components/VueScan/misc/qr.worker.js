import jsQR from "jsqr";

self.addEventListener("message", function(event) {
  const imageData = event.data;

  let result = jsQR(imageData.data, imageData.width, imageData.height,{
    inversionAttempts: "dontInvert",
  });

  let content = null;
  let location = null;

  if (result !== null) {
    content = result.data;
    location = result.location;
  }

  const message = {content, location};

  self.postMessage(message);
  result = null;
});
