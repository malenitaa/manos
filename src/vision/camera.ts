/**
 * Opens the front camera into a video element. Shared by the hand tracker and
 * the light reader: both see through the same lens, only what they read from
 * it differs. Does nothing if the element already has a stream.
 */
export async function openCamera(video: HTMLVideoElement): Promise<void> {
  if (video.srcObject) return;
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
    audio: false,
  });
  video.srcObject = stream;
  await video.play();
}
