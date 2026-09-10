import { ImageResponse } from "next/og";

export const alt = "Jacklet — Daily Blackjack. One daily deck. How far can you go?";
export const size = { width:1200, height:630 };
export const contentType = "image/png";

export default function PreviewImage() {
  return new ImageResponse(
    <div style={{width:"100%",height:"100%",display:"flex",padding:48,background:"#17271f",color:"#f5eedc"}}>
      <div style={{display:"flex",flexDirection:"column",justifyContent:"center",width:"100%",border:"2px solid #6b6042",borderRadius:24,padding:60,background:"#203e30"}}>
        <div style={{display:"flex",alignItems:"center",gap:28}}>
          <svg width="104" height="104" viewBox="0 0 64 64">
            <path d="M32 11C27 19 14 25 14 35a10 10 0 0 0 17 7c-1 6-3 9-7 11h16c-4-2-6-5-7-11a10 10 0 0 0 17-7c0-10-13-16-18-24Z" fill="#dfbd76"/>
          </svg>
          <span style={{fontSize:108,fontWeight:700,letterSpacing:-5}}>Jacklet</span>
        </div>
        <div style={{display:"flex",fontSize:28,letterSpacing:7,color:"#dfbd76",marginTop:12}}>DAILY BLACKJACK</div>
        <div style={{display:"flex",fontSize:40,marginTop:54}}>One daily deck. How far can you go?</div>
      </div>
    </div>,
    size
  );
}
