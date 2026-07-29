import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import "./workspace.css";
const outfit=Outfit({variable:"--sans",subsets:["latin"],display:"swap"});
export const metadata:Metadata={
  title:"Forge Gym AI",
  description:"Clear training, nutrition, recovery and progress guidance—built to stay out of your way.",
  icons:{
    icon:"/favicon.svg",
    shortcut:"/favicon.svg",
    apple:"/favicon.svg"
  },
  other:{"codex-preview":"development"}
};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="en"><body className={outfit.variable}>{children}</body></html>}
