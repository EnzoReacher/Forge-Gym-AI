import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
const outfit=Outfit({variable:"--sans",subsets:["latin"],display:"swap"});
export const metadata:Metadata={
  title:"Forge Gym AI",
  description:"A warrior-built command center for training, recovery and nutrition.",
  icons:{
    icon:"/viking-forge-logo.png",
    shortcut:"/viking-forge-logo.png",
    apple:"/viking-forge-logo.png"
  },
  other:{"codex-preview":"development"}
};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="vi"><body className={outfit.variable}>{children}</body></html>}
