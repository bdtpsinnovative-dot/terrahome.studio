---
status: accepted
---

# แยก Raw Events, Activity, Sessions และ Read Models

ระบบ Audience Analytics จะแยก `algorithm_events`, `algorithm_activity_intervals`, `algorithm_sessions`, `algorithm_product_daily_metrics` และ `algorithm_viewer_profiles` แทนการเพิ่มทุกอย่างลงในตาราง event เดียว เพื่อรองรับ heartbeat ทุก 15 วินาที การรวมเวลาจากหลายแท็บ และหน้า Admin ที่ต้องอ่านข้อมูลสรุปได้เร็ว โดยทุกข้อมูลที่เกี่ยวข้องกับสินค้าต้องคงขอบเขต `category_id = 'prop'` ของฐานข้อมูลร่วม

Raw Event และ Activity Interval มีเป้าหมายเก็บ 18 เดือน ส่วน Daily Aggregate เก็บถาวร แต่จะยังไม่เปิดการลบอัตโนมัติจนกว่าจะตรวจสอบว่า aggregate ครบและเทียบกับข้อมูลต้นทางได้ถูกต้อง
