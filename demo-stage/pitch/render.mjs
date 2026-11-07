import { chromium } from 'playwright-core'
import { mkdir, rm } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import path from 'node:path'
const root = path.resolve(import.meta.dirname, '../..')
const frames = path.join(root, 'demo-stage/pitch/.frames')
const narration = path.join(root, 'demo-stage/pitch/narration.m4a')
await new Promise((resolve,reject)=>{const p=spawn('python3',[path.join(root,'demo-stage/pitch/narrate.py')],{stdio:'inherit'});p.on('error',reject);p.on('exit',c=>c===0?resolve():reject(new Error(`narration ${c}`)))})
await rm(frames,{recursive:true,force:true}); await mkdir(frames,{recursive:true})
const browser = await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--no-sandbox']})
const page = await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1})
page.on('pageerror',e=>{throw e})
await page.goto('http://127.0.0.1:4177/',{waitUntil:'networkidle'})
await page.evaluate(()=>document.fonts.ready)
const fps=15, duration=44.32, count=Math.ceil(fps*duration)
for(let i=0;i<count;i++){
  await page.evaluate(t=>window.setPitchTime(t),i/fps)
  await page.screenshot({path:path.join(frames,`${String(i).padStart(4,'0')}.jpg`),type:'jpeg',quality:88,animations:'disabled'})
  if(i%100===0) process.stdout.write(`Rendered ${i}/${count}\n`)
}
await browser.close()
const args=['-hide_banner','-loglevel','error','-y','-framerate',String(fps),'-i',path.join(frames,'%04d.jpg'),'-i',narration,'-map','0:v:0','-map','1:a:0','-c:v','libx264','-preset','medium','-crf','19','-pix_fmt','yuv420p','-c:a','copy','-t',String(duration),path.join(root,'pitch.new.mp4')]
await new Promise((resolve,reject)=>{const p=spawn('ffmpeg',args,{stdio:'inherit'});p.on('error',reject);p.on('exit',c=>c===0?resolve():reject(new Error(`ffmpeg ${c}`)))})
process.stdout.write('Created pitch.new.mp4\n')
