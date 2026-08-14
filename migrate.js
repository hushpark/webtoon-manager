import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import { createClient } from '@supabase/supabase-js';

// Node.js 네트워크 SSL 연결 안정화
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// ⚠️ 본인의 실제 Supabase URL과 Anon Key를 꼭 넣어주세요!

const SUPABASE_URL = 'https://fmboamnuoajpishhqrty.supabase.co'; 
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZtYm9hbW51b2FqcGlzaGhxcnR5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY2NzA2MDYsImV4cCI6MjEwMjI0NjYwNn0.qGO0BsiAzHUnd4Z8gmffxoB-ZIMc26XAlhYgBVwCz7s';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false }
  });
  
  const cleanTitle = (str) => (str ? str.replace(/\s+/g, '').toLowerCase() : '');
  
  function processStandardFile(filePath, statusName) {
    return new Promise((resolve) => {
      const works = [];
      fs.createReadStream(filePath)
        .pipe(csv({ headers: false }))
        .on('data', (row) => {
          const title = row['2']?.trim();
          const episode = parseInt(row['3'] || '0', 10);
          const newColValue = row['4']?.trim();
  
          if (
            title && 
            title !== '제목' && 
            title !== '완결' && 
            title !== '연재중' && 
            title !== '시즌 완결' && 
            title !== '휴재'
          ) {
            works.push({
              title: title,
              title_clean: cleanTitle(title),
              episode: isNaN(episode) ? 0 : episode,
              status: statusName,
              has_fire_emoji: Boolean(newColValue)
            });
          }
        })
        .on('end', () => resolve(works));
    });
  }
  
  function processBongeoFile(filePath) {
    return new Promise((resolve) => {
      const works = [];
      fs.createReadStream(filePath)
        .pipe(csv({ headers: false }))
        .on('data', (row) => {
          const t1 = row['2']?.trim();
          const e1 = parseInt(row['3'] || '0', 10);
          if (t1 && t1 !== '제목' && t1 !== '완결') {
            works.push({ title: t1, title_clean: cleanTitle(t1), episode: isNaN(e1) ? 0 : e1, status: '본거_완결', has_fire_emoji: true });
          }
  
          const t2 = row['4']?.trim();
          const e2 = parseInt(row['5'] || '0', 10);
          if (t2 && t2 !== '제목' && t2 !== '시즌 완결') {
            works.push({ title: t2, title_clean: cleanTitle(t2), episode: isNaN(e2) ? 0 : e2, status: '본거_시즌완결', has_fire_emoji: true });
          }
  
          const t3 = row['6']?.trim();
          const e3 = parseInt(row['7'] || '0', 10);
          if (t3 && t3 !== '제목' && t3 !== '연재중') {
            works.push({ title: t3, title_clean: cleanTitle(t3), episode: isNaN(e3) ? 0 : e3, status: '본거_연재중', has_fire_emoji: true });
          }
  
          const t4 = row['9']?.trim();
          const e4 = parseInt(row['10'] || '0', 10);
          if (t4 && t4 !== '제목' && t4 !== '휴재') {
            works.push({ title: t4, title_clean: cleanTitle(t4), episode: isNaN(e4) ? 0 : e4, status: '본거_휴재', has_fire_emoji: true });
          }
        })
        .on('end', () => resolve(works));
    });
  }
  
  async function startAutoMigration() {
    const dirPath = path.join(process.cwd(), 'csv_data');
    if (!fs.existsSync(dirPath)) {
      console.error("❌ 'csv_data' 폴더를 찾을 수 없습니다.");
      return;
    }
  
    const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.csv'));
    let allWorksToInsert = [];
  
    console.log(`📁 총 ${files.length}개의 CSV 파일을 감지했습니다. 분석을 시작합니다...\n`);
  
    for (const file of files) {
      const fullPath = path.join(dirPath, file);
  
      if (file.includes('본거')) {
        const works = await processBongeoFile(fullPath);
        console.log(`📄 [${file}] ➡️ 본거 통합 데이터 ${works.length}개 추출 완료`);
        allWorksToInsert.push(...works);
      } else {
        let statusName = file.replace('웹툰 - ', '').replace('.csv', '').trim();
        const works = await processStandardFile(fullPath, statusName);
        console.log(`📄 [${file}] ➡️ 상태: [${statusName}] - ${works.length}개 추출 완료`);
        allWorksToInsert.push(...works);
      }
    }
  
    console.log(`\n📦 전체 총 ${allWorksToInsert.length}개의 웹툰 데이터를 추출했습니다.`);
    console.log('🚀 Supabase 업로드를 시작합니다...');
  
    const BATCH_SIZE = 50;
    let successCount = 0;
  
    for (let i = 0; i < allWorksToInsert.length; i += BATCH_SIZE) {
      const batch = allWorksToInsert.slice(i, i + BATCH_SIZE);
      const { error } = await supabase.from('works').insert(batch);
  
      if (error) {
        console.error(`❌ 업로드 중 오류 발생 (배치 ${Math.floor(i / BATCH_SIZE) + 1}):`, error.message);
      } else {
        successCount += batch.length;
        console.log(`✅ ${successCount} / ${allWorksToInsert.length} 개 업로드 성공...`);
      }
    }
  
    console.log('\n🎉 모든 시트의 웹툰 데이터 이전이 완료되었습니다!');
  }
  
  startAutoMigration();