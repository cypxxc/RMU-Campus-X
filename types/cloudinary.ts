/**
 * Cloudinary Image Types
 * กำหนด Type ให้ชัดเจนเพื่อจัดการรูปภาพในโปรเจกต์ได้ง่าย
 */

/** Response จาก Cloudinary Upload API (upload_stream / upload) */
export interface CloudinaryImage {
  public_id: string
  url?: string
  secure_url: string
  format?: string
  width?: number
  height?: number
}

/** Reference ที่เก็บใน Firestore – ใช้เฉพาะ public_id เพื่อ flexibility ในการ transform */
export type CloudinaryImageRef = string
