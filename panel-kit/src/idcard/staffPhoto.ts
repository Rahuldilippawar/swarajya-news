"use client";

import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { getFirebase } from "../firebase";

export const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

/** Shrinks a photo to at most 600 px on its long side as JPEG, so it stays well under the 2 MB upload limit. */
async function resizePhoto(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not read the photo."))), "image/jpeg", 0.85),
  );
}

/** Uploads a staff member's card photo (staff-photos/<uid>/…) and returns its URL for updateStaffProfile. */
export async function uploadStaffPhoto(uid: string, file: File): Promise<string> {
  if (!PHOTO_TYPES.includes(file.type)) throw new Error("Use a JPG, PNG or WebP photo.");
  const fileRef = ref(getFirebase().storage, `staff-photos/${uid}/${Date.now()}.jpg`);
  await uploadBytes(fileRef, await resizePhoto(file), { contentType: "image/jpeg" });
  return getDownloadURL(fileRef);
}
