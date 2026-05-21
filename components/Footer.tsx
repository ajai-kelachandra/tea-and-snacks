"use client";

import Link from "next/link";
import { FiInstagram, FiLinkedin } from "react-icons/fi";

export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-100 pt-12 pb-8 px-6 font-dm-sans">
      <div className="max-w-7xl mx-auto space-y-10">
        {/* Top Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="flex flex-col leading-none uppercase">
              <span className="text-xl font-black dark:text-white text-black tracking-tighter uppercase">IRO</span>
              <span className="text-[10px] font-black text-[#1d4ed8] tracking-[0.3em] ml-0.5 uppercase">PEOPLE</span>
            </div>
            <div className="w-[1px] h-4 bg-gray-200" />
            <span className="text-xs text-gray-400 font-medium tracking-tight">
              IRO People · Workplace HRMS & Pantry
            </span>
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs font-bold text-gray-500 uppercase tracking-widest">
            <Link href="/user/privacy" className="hover:text-black transition-colors">Privacy</Link>
            <Link href="/user/terms" className="hover:text-black transition-colors">Terms</Link>
            <a href="mailto:ajai.kc@iroidtechnologies.com" className="hover:text-black transition-colors">Contact</a>
          </div>
        </div>

        {/* Unofficial Banner */}
        <div className="bg-gray-50 rounded-2xl p-6 text-[11px] text-gray-500 leading-relaxed border border-gray-100">
          <span className="font-black text-gray-700 mr-1">Internal.</span>
          This is an internal office application for tracking corporate attendance, leave calendars, daily timesheets, and pantry snacks.
          A community project for efficient office management.
        </div>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-[10px] font-medium text-gray-300 uppercase tracking-[0.15em] pt-6 border-t border-gray-50">
          <span>© 2026 IRO People</span>
          <div className="flex items-center gap-3">
            <span>One team</span>
            <span className="w-1 h-1 rounded-full bg-gray-200" />
            <span>One snack</span>
            <span className="w-1 h-1 rounded-full bg-gray-200" />
            <span>One voice</span>
          </div>
        </div>

        {/* Credits */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-4 pt-4 text-xs font-bold">
          <span className="text-gray-400">Built by <span className="text-black">Ajai kc</span></span>

          <a href="#" className="flex items-center gap-2 text-gray-400 hover:text-black transition-colors">
            <FiInstagram size={14} className="text-black" />
            <span>ajai_kc</span>
          </a>

          <a href="#" className="flex items-center gap-2 text-gray-400 hover:text-black transition-colors">
            <FiLinkedin size={14} className="text-[#0077b5]" />
            <span>ajaikc</span>
          </a>
        </div>
      </div>
    </footer>
  );
}
