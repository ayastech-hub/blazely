import React, { useState, useEffect } from "react";
import FilterBar from "../components/FilterBar";
import AIChatSupport from "../components/AIChatSupport";
import TradeAlertsMarquee from "../components/TradeAlertsMarquee";
import TrendingTokens from "../components/TrendingTokens";
import {
  ChevronLeft,
  ChevronRight,
  Twitter,
  Send,
  BookOpen,
} from "lucide-react";

import TokenList from "../components/TokenList";
import { fetchTokensFromSupabase } from "../api/supabaseTokens";


const TOKENS_PER_PAGE = 12;


/* ---------------- Pagination ---------------- */

function buildPageList(currentPage, totalPages, maxVisible = 5) {
  const pages = [];

  if (totalPages <= maxVisible) {
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i);
    }
    return pages;
  }

  const half = Math.floor(maxVisible / 2);

  let start = Math.max(1, currentPage - half);
  let end = Math.min(totalPages, currentPage + half);


  if (currentPage - half < 1) {
    end = Math.min(
      totalPages,
      end + (1 - (currentPage - half))
    );
  }


  if (currentPage + half > totalPages) {
    start = Math.max(
      1,
      start - (currentPage + half - totalPages)
    );
  }


  if (start > 1) {
    pages.push(1);

    if (start > 2) {
      pages.push("left");
    }
  }


  for (let i = start; i <= end; i++) {
    pages.push(i);
  }


  if (end < totalPages) {

    if (end < totalPages - 1) {
      pages.push("right");
    }

    pages.push(totalPages);
  }


  return pages;
}



function Pagination({
  totalPages,
  currentPage,
  onPageChange,
  isMobile
}) {

  if (!totalPages || totalPages <= 1) {
    return null;
  }


  if (isMobile) {

    return (
      <nav className="mt-6 flex justify-center items-center gap-3">

        <button
          disabled={currentPage === 1}
          onClick={() =>
            onPageChange(
              Math.max(1,currentPage-1)
            )
          }
          className="
          px-3 py-1 rounded
          bg-slate-900
          border border-slate-800
          text-slate-400
          disabled:opacity-30"
        >
          <ChevronLeft size={14}/>
        </button>


        <div className="
        text-xs font-mono
        text-slate-400
        bg-[#0b0f19]
        border border-slate-900
        px-3 py-1 rounded">

          PAGE {currentPage} / {totalPages}

        </div>



        <button
          disabled={currentPage === totalPages}
          onClick={() =>
            onPageChange(
              Math.min(totalPages,currentPage+1)
            )
          }
          className="
          px-3 py-1 rounded
          bg-slate-900
          border border-slate-800
          text-slate-400
          disabled:opacity-30"
        >
          <ChevronRight size={14}/>
        </button>


      </nav>
    );
  }



  const pages =
    buildPageList(currentPage,totalPages);



  return (

    <nav className="
    mt-8 flex justify-center
    gap-1.5 flex-wrap">


      <button
        onClick={() =>
          onPageChange(
            Math.max(1,currentPage-1)
          )
        }
        disabled={currentPage===1}
        className="
        w-7 h-7 rounded
        bg-slate-900
        border border-slate-800
        text-slate-400
        disabled:opacity-30"
      >

        <ChevronLeft size={14}/>

      </button>


      {
        pages.map((p,index)=>

          typeof p==="number" ?

          (
            <button

            key={index}

            onClick={() =>
              onPageChange(p)
            }

            className={`
            w-7 h-7 rounded
            text-xs font-mono
            border

            ${
              p===currentPage
              ?
              "bg-[#96d6cd] text-black border-[#96d6cd]"
              :
              "bg-slate-900 border-slate-800 text-slate-400"
            }
            `}
            >

              {String(p).padStart(2,"0")}

            </button>

          )

          :

          <span
          key={index}
          className="text-slate-600 px-2">
            ...
          </span>

        )
      }


      <button
      onClick={() =>
        onPageChange(
          Math.min(totalPages,currentPage+1)
        )
      }
      disabled={currentPage===totalPages}
      className="
      w-7 h-7 rounded
      bg-slate-900
      border border-slate-800
      text-slate-400
      disabled:opacity-30"
      >

        <ChevronRight size={14}/>

      </button>


    </nav>
  );
}



/* ---------------- Footer ---------------- */


const Footer = () => (

<footer className="
mt-16
border-t
border-slate-900
bg-[#0b0f19]/30">

<div className="
max-w-[1600px]
mx-auto
px-4
py-6
flex
flex-col
md:flex-row
justify-between
items-center
gap-4">


<div>

<div
className="
text-xs
font-black
uppercase
tracking-widest
text-[#96d6cd]"
>
Blazely
</div>


<p className="
text-[10px]
font-mono
text-slate-600">

© {new Date().getFullYear()} CORE

</p>


</div>



<div className="flex gap-2">


<a className="p-2 text-slate-500">
<Twitter size={14}/>
</a>


<a className="p-2 text-slate-500">
<Send size={14}/>
</a>


<a className="p-2 text-slate-500">
<BookOpen size={14}/>
</a>


</div>


</div>

</footer>

);



export default function Home(){

const [tokens,setTokens]=useState([]);

const [currentPage,setCurrentPage]=useState(1);

const [sort,setSort]=useState("Last Trade");

const [searchTerm,setSearchTerm]=useState("");

const [listedOnly,setListedOnly]=useState(false);

const [totalCount,setTotalCount]=useState(0);

const [loading,setLoading]=useState(false);

