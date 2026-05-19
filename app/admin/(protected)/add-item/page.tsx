"use client";

import { useEffect, useState } from "react";
import ItemForm from "@/components/admin/ItemForm";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, getDocs } from "firebase/firestore";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { addItem, fetchItems, updateItem, deleteItem } from "@/features/itemsSlice";
import toast from "react-hot-toast";
import { FiSun, FiMoon, FiCheck, FiSave, FiInfo } from "react-icons/fi";

export default function AddItemPage() {
  const dispatch = useAppDispatch();
  const { items } = useAppSelector((s) => s.items);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [savingSession, setSavingSession] = useState(false);
  
  // Tab session states: morning vs evening
  const [activeSession, setActiveSession] = useState<"morning" | "evening">("morning");
  // Holds currently selected template IDs in the UI for the active tab
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    dispatch(fetchItems());
  }, [dispatch]);

  // Fetch quick templates
  useEffect(() => {
    async function fetchTemplates() {
      try {
        const q = query(collection(db, "quickTemplates"), orderBy("lastUsed", "desc"));
        const snapshot = await getDocs(q);
        setTemplates(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (e) {
        console.error("Failed to fetch templates:", e);
      } finally {
        setLoadingTemplates(false);
      }
    }
    fetchTemplates();
  }, []);

  // Update selected templates in the local UI state based on database items and active tab
  useEffect(() => {
    if (templates.length === 0) return;

    // Filter active items in current session
    const activeSessionItems = items.filter(
      (item) => item.isActive && item.timeSlot === activeSession
    );

    // Get the template IDs of the active items (matching by name)
    const activeTemplateIds = templates
      .filter((t) => activeSessionItems.some((item) => item.name === t.name))
      .map((t) => t.id);

    setSelectedIds(activeTemplateIds);
  }, [activeSession, items, templates]);

  const handleToggleTemplate = (templateId: string) => {
    setSelectedIds((prev) =>
      prev.includes(templateId)
        ? prev.filter((id) => id !== templateId)
        : [...prev, templateId]
    );
  };

  const handleSaveSession = async () => {
    setSavingSession(true);
    try {
      const promises = templates.map(async (template) => {
        const isSelected = selectedIds.includes(template.id);
        
        // Find existing item in the main menu (teaSnackItems) with the same name and timeslot
        const existingItem = items.find(
          (item) => item.name === template.name && item.timeSlot === activeSession
        );

        if (isSelected) {
          if (existingItem) {
            // Make sure it is active if it exists
            if (!existingItem.isActive) {
              await dispatch(
                updateItem({ id: existingItem.id, data: { isActive: true } })
              ).unwrap();
            }
          } else {
            // Add a new active item to this session
            const { id, lastUsed, ...itemData } = template;
            await dispatch(
              addItem({
                ...itemData,
                timeSlot: activeSession,
                isActive: true,
              })
            ).unwrap();
          }
        } else {
          // If deselected, remove it from the menu for this session
          if (existingItem) {
            await dispatch(deleteItem(existingItem.id)).unwrap();
          }
        }
      });

      await Promise.all(promises);
      toast.success(
        `${activeSession === "morning" ? "Morning 🌅" : "Evening 🌙"} session menu saved successfully!`
      );
      dispatch(fetchItems()); // Refresh Redux store
    } catch (e) {
      console.error("Save session failed:", e);
      toast.error("Failed to save session menu.");
    } finally {
      setSavingSession(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto pb-12 px-4 sm:px-6 font-dm-sans">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 leading-none">Menu Management</h1>
        <p className="text-sm text-gray-500 mt-1.5">
          Add new items to the quick template library or configure active morning and evening session menus.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Side: Create / Add New Template Form */}
        <div className="lg:col-span-5">
          <div className="mb-4">
            <h2 className="text-sm font-bold uppercase tracking-[0.15em] text-gray-400">Add New Library Template</h2>
          </div>
          <div className="card p-6 shadow-sm border border-gray-100 bg-white rounded-3xl">
            <ItemForm mode="add" />
          </div>
        </div>

        {/* Right Side: 2-Tab Session Designer */}
        <div className="lg:col-span-7 flex flex-col space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="text-sm font-bold uppercase tracking-[0.15em] text-gray-400">Session Menu </h2>
            
            {/* Session Tabs Selector */}
            <div className="flex bg-gray-100/80 p-1 rounded-2xl border border-gray-200">
              <button
                onClick={() => setActiveSession("morning")}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-300 ${
                  activeSession === "morning"
                    ? "bg-amber-500 text-white shadow-md shadow-amber-200"
                    : "text-gray-500 hover:text-gray-800"
                }`}
              >
                <FiSun size={14} />
                Morning
              </button>
              <button
                onClick={() => setActiveSession("evening")}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-300 ${
                  activeSession === "evening"
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-200"
                    : "text-gray-500 hover:text-gray-800"
                }`}
              >
                <FiMoon size={14} />
                Evening
              </button>
            </div>
          </div>

          {/* Quick templates grid */}
          <div className={`p-6 rounded-3xl border transition-all duration-300 bg-white ${
            activeSession === "morning" 
              ? "border-amber-100 shadow-xl shadow-amber-50/20" 
              : "border-indigo-100 shadow-xl shadow-indigo-50/20"
          }`}>
            <div className="flex items-center justify-between mb-4 border-b border-gray-50 pb-4">
              <div>
                <h3 className={`text-base font-bold capitalize flex items-center gap-2 ${
                  activeSession === "morning" ? "text-amber-800" : "text-indigo-900"
                }`}>
                  {activeSession === "morning" ? <FiSun className="animate-spin-slow text-amber-500" /> : <FiMoon className="text-indigo-500" />}
                  {activeSession} Session Items
                </h3>
                <p className="text-xs text-gray-400 mt-1">
                  Select the template items to make active in the user menu.
                </p>
              </div>

              {/* Counter badge */}
              <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                activeSession === "morning" 
                  ? "bg-amber-50 text-amber-700 border border-amber-100" 
                  : "bg-indigo-50 text-indigo-700 border border-indigo-100"
              }`}>
                {selectedIds.length} Selected
              </span>
            </div>

            {loadingTemplates ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 py-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="w-full aspect-square rounded-2xl bg-gray-50 animate-pulse border border-gray-100" />
                ))}
              </div>
            ) : templates.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-gray-100 rounded-2xl">
                <p className="text-sm text-gray-400 italic">No templates available. Please create templates using the form on the left first.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 overflow-y-auto max-h-[460px] pr-1 no-scrollbar">
                {templates.map((template) => {
                  const isSelected = selectedIds.includes(template.id);
                  
                  return (
                    <button
                      key={template.id}
                      onClick={() => handleToggleTemplate(template.id)}
                      className={`group relative flex flex-col items-center gap-2 p-2.5 rounded-2xl border transition-all duration-300 active:scale-95 text-left bg-white
                        ${isSelected
                          ? activeSession === "morning"
                            ? "border-amber-400 shadow-md ring-2 ring-amber-100"
                            : "border-indigo-400 shadow-md ring-2 ring-indigo-100"
                          : "border-gray-100 hover:border-gray-300 hover:shadow"
                        }`}
                    >
                      {/* Image Thumbnail */}
                      <div className="w-full aspect-square rounded-xl overflow-hidden bg-gray-50 relative">
                        <img
                          src={template.imageUrl}
                          alt={template.name}
                          className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ${
                            isSelected ? "" : "grayscale-[20%]"
                          }`}
                        />

                        {/* Top corner type indicator */}
                        <div className="absolute top-1 left-1 bg-black/40 backdrop-blur-sm text-white px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider">
                          {template.type}
                        </div>
                      </div>

                      {/* Info & Selection state */}
                      <div className="w-full text-center px-1">
                        <p className="text-[10px] font-bold text-gray-800 truncate capitalize leading-tight">
                          {template.name}
                        </p>
                        <p className="text-[8px] text-gray-400 truncate mt-0.5">
                          {template.description}
                        </p>
                      </div>

                      {/* Selected Checkmark overlay */}
                      {isSelected && (
                        <div className={`absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full text-white flex items-center justify-center border-2 border-white shadow-md z-10 animate-scaleIn ${
                          activeSession === "morning" ? "bg-amber-500" : "bg-indigo-600"
                        }`}>
                          <FiCheck size={12} className="stroke-[3]" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Sticky Actions Bar */}
            <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between gap-4">
              <div className="flex items-start gap-2 max-w-[60%]">
                <FiInfo className="text-gray-400 mt-0.5 shrink-0" size={13} />
                <p className="text-[10px] text-gray-400 leading-normal font-medium">
                  Select all templates you wish to display for the <span className="font-bold">{activeSession}</span> session, then click save.
                </p>
              </div>

              <button
                onClick={handleSaveSession}
                disabled={savingSession}
                className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-bold text-white shadow-lg transition-all duration-300 active:scale-95 disabled:opacity-50 shrink-0 ${
                  activeSession === "morning"
                    ? "bg-amber-500 hover:bg-amber-600 shadow-amber-100 hover:shadow-xl"
                    : "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100 hover:shadow-xl"
                }`}
              >
                {savingSession ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <FiSave size={14} />
                )}
                Save Session Menu
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
