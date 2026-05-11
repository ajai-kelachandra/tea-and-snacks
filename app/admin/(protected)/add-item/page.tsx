"use client";

import { useEffect, useState } from "react";
import ItemForm from "@/components/admin/ItemForm";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { addItem, fetchItems } from "@/features/itemsSlice";
import toast from "react-hot-toast";

export default function AddItemPage() {
  const dispatch = useAppDispatch();
  const { items } = useAppSelector((s) => s.items);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [addingId, setAddingId] = useState<string | null>(null);

  useEffect(() => {
    dispatch(fetchItems());
  }, [dispatch]);

  useEffect(() => {
    async function fetchTemplates() {
      try {
        const q = query(collection(db, "quickTemplates"), orderBy("lastUsed", "desc"), limit(12));
        const snapshot = await getDocs(q);
        setTemplates(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingTemplates(false);
      }
    }
    fetchTemplates();
  }, []);

  const handleQuickAdd = async (template: any) => {
    const isAlreadyInMenu = items.some(i => i.name === template.name);
    if (isAlreadyInMenu) return;

    setAddingId(template.id);
    try {
      const { id, lastUsed, ...itemData } = template;
      await dispatch(addItem(itemData)).unwrap();
      toast.success(`${itemData.name} added! 🚀`);
    } catch (e) {
      toast.error("Quick add failed.");
    } finally {
      setAddingId(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-12">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 leading-none">Add New Item</h1>
        <p className="text-sm text-gray-500 mt-1.5">
          Fill the form manually or click a template to add instantly.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="card p-6 shadow-sm border-gray-100">
            <ItemForm mode="add" />
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">Quick Templates</h3>
          </div>
          
          <div className="space-y-4">
            {loadingTemplates ? (
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <div key={i} className="w-full aspect-square rounded-2xl bg-gray-100 animate-pulse" />
                ))}
              </div>
            ) : templates.length === 0 ? (
              <p className="text-xs text-gray-400 italic">No templates yet.</p>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {templates.map((template) => {
                  const isAlreadyInMenu = items.some(i => i.name === template.name);
                  const isAdding = addingId === template.id;

                  return (
                    <button
                      key={template.id}
                      onClick={() => handleQuickAdd(template)}
                      disabled={isAlreadyInMenu || isAdding}
                      className={`group relative flex flex-col items-center gap-2 p-2 rounded-2xl border transition-all duration-200 shadow-sm
                        ${isAlreadyInMenu 
                          ? "border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed" 
                          : "border-gray-100 bg-white hover:border-[#1d4ed8] hover:bg-blue-50/30 active:scale-95"
                        }`}
                    >
                      <div className="w-full aspect-square rounded-xl overflow-hidden bg-gray-50">
                        {isAdding ? (
                          <div className="w-full h-full flex items-center justify-center bg-blue-50">
                            <div className="w-5 h-5 border-2 border-[#1d4ed8] border-t-transparent rounded-full animate-spin" />
                          </div>
                        ) : (
                          <img 
                            src={template.imageUrl} 
                            alt={template.name}
                            className={`w-full h-full object-cover transition-transform duration-300 ${isAlreadyInMenu ? 'scale-105' : 'group-hover:scale-105'}`}
                          />
                        )}
                      </div>
                      <span className={`text-[9px] font-bold capitalize tracking-tight truncate w-full text-center px-1 ${isAlreadyInMenu ? 'text-emerald-600' : 'text-gray-500'}`}>
                        {template.name}
                      </span>
                      
                      {isAlreadyInMenu && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center border-2 border-white shadow-sm z-10 animate-scaleIn">
                          <span className="text-[10px] font-black">✓</span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100">
            <p className="text-[11px] text-amber-800 leading-relaxed font-medium capitalize">
              <span className="font-black uppercase tracking-widest block mb-1">One-click add</span>
              Tap any template to add it instantly to your menu. Items already added will show a tick mark.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}


