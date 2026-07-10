import React, { useState, useEffect } from "react";
import { Routes, Route, useParams } from "react-router-dom";

import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import CreateToken from "./pages/CreateToken";
import TokenInfoPage from "./pages/TokenInfoPage";
import Bridge from "./pages/Bridge";
import Leaderboard from "./pages/Leaderboard";
import Profile from "./pages/Profile";
import Locking from "./pages/Locking";
import PublicProfile from "./components/PublicProfile";
import Welcome from "./pages/Welcome";

import { MaintenanceGuard } from "./components/MaintenanceGuard";

import {
  WagmiConfig,
  createConfig,
  configureChains,
} from "wagmi";

import {
  walletConnect,
  injected,
  coinbaseWallet,
} from "wagmi/connectors";

import { sepolia } from "wagmi/chains";

import { publicProvider } from "wagmi/providers/public";

import {
  ConnectKitProvider,
  ConnectKitButton,
} from "connectkit";

import {
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";


const queryClient = new QueryClient();

const walletConnectProjectId =
  import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;


// ===============================
// Chain Configuration
// ===============================

const { chains, publicClient } =
  configureChains(
    [sepolia],
    [
      publicProvider()
    ]
  );


// ===============================
// Wallet Configuration
// No Family / Embedded wallets
// ===============================

const config = createConfig({

  autoConnect: true,

  connectors: [

    // MetaMask, Rabby, Brave, Trust browser wallets
    injected({
      shimDisconnect: true,
    }),


    // Mobile wallet support
    // MetaMask mobile
    // Trust Wallet
    // Rainbow
    // OKX
    // Ledger mobile
    walletConnect({

      projectId: walletConnectProjectId,

      showQrModal: true,

    }),


    // Coinbase Wallet
    coinbaseWallet({

      appName: "Launchpad",

      jsonRpcUrl:
        "https://rpc.sepolia.org",

    }),

  ],

  publicClient,

});


// ===============================
// ConnectKit Theme
// ===============================

const ckTheme = {

  "--ck-font-family":
    "JetBrains Mono, Fira Code, Inter, ui-sans-serif, system-ui",

  "--ck-border-radius": "4px",

  "--ck-connectbutton-background":
    "#96d6cd",

  "--ck-connectbutton-color":
    "#030712",

  "--ck-connectbutton-border-radius":
    "4px",

  "--ck-connectbutton-font-size":
    "13px",

  "--ck-connectbutton-padding":
    "8px 16px",

  "--ck-connectbutton-hover-background":
    "#b2e3dc",

  "--ck-accent-color":
    "#96d6cd",

  "--ck-body-background":
    "#0b0f19",

  "--ck-body-color":
    "#E2E8F0",

  "--ck-body-color-muted":
    "#64748B",

  "--ck-overlay-background":
    "rgba(3,7,18,0.85)",

};


// ===============================
// Custom Button
// ===============================

export function CustomConnectButton({
  size="md"
}) {

const sizeMap={

sm:"px-3 py-1 text-xs rounded",

md:"px-4 py-1.5 text-xs rounded",

lg:"px-6 py-2.5 text-sm rounded",

};


const classes =
`
inline-flex
items-center
justify-center
font-mono
font-black
uppercase
tracking-wider
transition-all
duration-150
active:scale-[0.98]
${sizeMap[size]}
`;


return (

<ConnectKitButton.Custom>

{
({
isConnected,
show,
address,
ensName
})=>(

<button

className={classes}

onClick={show}

style={{

background:
ckTheme["--ck-connectbutton-background"],

color:
ckTheme["--ck-connectbutton-color"],

borderRadius:
ckTheme["--ck-connectbutton-border-radius"],

}}

>

{

isConnected ?

(
ensName ||
`${address.slice(0,6)}...${address.slice(-4)}`
)

:

(
"Connect Wallet"
)

}

</button>


)

}

</ConnectKitButton.Custom>


);

}



// ===============================
// Profile Route
// ===============================

function WalletLoader(){

const {
walletAddress
}=useParams();


return (

<PublicProfile
walletAddress={walletAddress}
/>

);

}



// ===============================
// App
// ===============================


export default function App(){


const [
showWelcome,
setShowWelcome
]=useState(null);



useEffect(()=>{

const skip =
localStorage.getItem(
"hideWelcomeScreen"
);


setShowWelcome(
skip==="true"
?false
:true
);


},[]);



if(showWelcome===null){

return (

<div className="min-h-screen bg-[#030712]" />

);

}



const Providers = ({children})=>(

<QueryClientProvider client={queryClient}>

<WagmiConfig config={config}>

<ConnectKitProvider
customTheme={ckTheme}
mode="dark"
>

{children}

</ConnectKitProvider>

</WagmiConfig>

</QueryClientProvider>

);



if(showWelcome){

return (

<Providers>

<Welcome
onDismiss={()=>
setShowWelcome(false)
}

/>

</Providers>

);

}



return (

<Providers>


<MaintenanceGuard>


<div className="flex flex-col min-h-screen bg-[#030712]">


<Navbar />


<main
className="
flex-1
w-full
max-w-[1600px]
mx-auto
px-4
sm:px-6
lg:px-8
pt-24
pb-24
"
>


<Routes>

<Route path="/" element={<Home />} />

<Route path="/create" element={<CreateToken />} />

<Route
path="/token/:address"
element={<TokenInfoPage />}
/>


<Route
path="/bridge"
element={<Bridge />}
/>


<Route
path="/leaderboard"
element={<Leaderboard />}
/>


<Route
path="/profile"
element={<Profile />}
/>


<Route
path="/locking"
element={<Locking />}
/>


<Route
path="/user/:walletAddress"
element={<WalletLoader />}
/>


</Routes>


</main>


</div>


</MaintenanceGuard>


</Providers>


);

}