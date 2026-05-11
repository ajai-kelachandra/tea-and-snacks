"use client";

import Link from "next/link";
import { FiArrowLeft, FiShield } from "react-icons/fi";

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto py-12 px-6 font-dm-sans">
      <Link 
        href="/user/menu" 
        className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-400 hover:text-black transition-colors mb-10"
      >
        <FiArrowLeft size={14} />
        Back to Menu
      </Link>

      <div className="space-y-12">
        <div className="flex items-center gap-4 text-[#1d4ed8]">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center">
            <FiShield size={24} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-black tracking-tight">Privacy Policy</h1>
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mt-1">Last Updated: May 2026</p>
          </div>
        </div>

        <section className="space-y-4">
          <h2 className="text-xl font-black text-black tracking-tight">1. Data We Collect</h2>
          <p className="text-sm text-gray-500 leading-relaxed">
            Iro Snack collects minimal data to facilitate office refreshment tracking. This includes your name, official email address, and order history. 
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-black text-black tracking-tight">2. How We Use Data</h2>
          <p className="text-sm text-gray-500 leading-relaxed">
            Your information is used strictly for:
          </p>
          <ul className="list-disc pl-5 text-sm text-gray-500 space-y-2">
            <li>Processing and identifying your snack and beverage orders.</li>
            <li>Maintaining a history of your daily selections.</li>
            <li>Ensuring fair distribution of refreshments across the team.</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-black text-black tracking-tight">3. Data Retention</h2>
          <p className="text-sm text-gray-500 leading-relaxed">
            Order logs are maintained for the current financial year to assist with office administration and inventory planning.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-black text-black tracking-tight">4. Security</h2>
          <p className="text-sm text-gray-500 leading-relaxed">
            We use industry-standard encryption (Firebase Auth) to protect your login credentials. Your data is only accessible to authorized office administrators.
          </p>
        </section>

        <div className="pt-10 border-t border-gray-100 text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-300">
            For internal office use only
          </p>
        </div>
      </div>
    </div>
  );
}
