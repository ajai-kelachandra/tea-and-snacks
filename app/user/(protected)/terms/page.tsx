"use client";

import Link from "next/link";
import { FiArrowLeft, FiFileText } from "react-icons/fi";

export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto py-12 px-6 font-dm-sans">
      <Link 
        href="/user/home" 
        className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-400 hover:text-black transition-colors mb-10"
      >
        <FiArrowLeft size={14} />
        Back to Home
      </Link>

      <div className="space-y-12">
        <div className="flex items-center gap-4 text-[#1d4ed8]">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center">
            <FiFileText size={24} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-black tracking-tight">Terms of Use</h1>
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mt-1">Version 1.0 · May 2026</p>
          </div>
        </div>

        <section className="space-y-4">
          <h2 className="text-xl font-black text-black tracking-tight">1. Eligibility</h2>
          <p className="text-sm text-gray-500 leading-relaxed">
            IRO People is an internal platform exclusively for employees and authorized personnel. Access is granted via official corporate credentials.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-black text-black tracking-tight">2. Fair Usage Policy</h2>
          <p className="text-sm text-gray-500 leading-relaxed">
            To ensure all team members enjoy our refreshments, a fair usage policy is in place:
          </p>
          <ul className="list-disc pl-5 text-sm text-gray-500 space-y-2">
            <li>Limit of 2 snacks per day per user.</li>
            <li>Beverages (Tea/Coffee) should be ordered responsibly during designated sessions.</li>
            <li>Bulk ordering for others is discouraged to maintain accurate inventory.</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-black text-black tracking-tight">3. Ordering Sessions</h2>
          <p className="text-sm text-gray-500 leading-relaxed">
            Orders are divided into Morning and Evening sessions. Please ensure your orders are placed within the active session times to ensure prompt preparation.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-black text-black tracking-tight">4. Prohibited Activities</h2>
          <p className="text-sm text-gray-500 leading-relaxed">
            Users must not attempt to bypass the daily limit, share credentials, or interfere with the platform's operation. This system is a community benefit and should be treated with respect.
          </p>
        </section>

        <div className="pt-10 border-t border-gray-100 text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-300">
            Enjoy your snacks responsibly
          </p>
        </div>
      </div>
    </div>
  );
}
