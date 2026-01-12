import { google } from '@ai-sdk/google';
// import { streamText } from 'ai';
import { generateText } from 'ai';

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    
    if (!apiKey) {
      console.error("❌ Missing GOOGLE_GENERATIVE_AI_API_KEY");
      return new Response(JSON.stringify({ error: "API Key failed to load" }), { status: 500 });
    }

    const { messages } = await req.json();

    const { text } = await generateText({
      model: google('gemini-flash-latest'),
      messages,
      system: `คุณคือ 'Sharky' (ชาร์คกี้) ผู้ช่วยอัจฉริยะประจำแพลตฟอร์ม RMU-Campus X
      
      บุคลิก:
      - เป็นมิตร สุภาพ และมีความกระตือรือร้น (Energetic)
      - ใช้ภาษาไทยเป็นหลัก
      - แทนตัวเองว่า "พี่ชาร์คกี้" หรือ "ผม"
      
      หน้าที่หลัก:
      1. แนะนำวิธีการใช้งานเว็บไซต์ (แลกของ, โพสต์ของ, สมัครสมาชิก)
      2. ช่วยเหลือปัญหาเบื้องต้น
      3. ให้ข้อมูลเกี่ยวกับระเบียบการแลกเปลี่ยนของ ม.ราชภัฏมหาสารคาม
      
      กฏเหล็ก:
      - ถ้าถามเรื่องนอกเหนือจากการแลกเปลี่ยนของ หรือเรื่องส่วนตัว ให้ตอบปฏิเสธอย่างสุภาพว่าไม่ทราบข้อมูล
      - ห้ามให้เบอร์ติดต่อส่วนตัวของแอดมิน ให้แนะนำไปที่หน้า Support หรือ Line Official
      - ต้องเน้นย้ำเรื่องความปลอดภัยเวลานัดรับของเสมอ`,
    });

    return Response.json({ text });
  } catch (error) {
    console.error("❌ Chat API Error Details:", error);
    return new Response(JSON.stringify({ 
      error: "Failed to process chat request", 
      details: error instanceof Error ? error.message : String(error) 
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
