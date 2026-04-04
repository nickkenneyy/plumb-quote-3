// src/hooks/useTemplates.js
// Handles all Firestore reads/writes for user's saved templates

import { useState, useEffect } from "react";
import {
  collection,
  getDocs,
  setDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "../firebase";
import { DEFAULT_TEMPLATES } from "../data/templates";

export function useTemplates(userId) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);

  // Path: users/{userId}/templates
  const templatesRef = userId
    ? collection(db, "users", userId, "templates")
    : null;

  useEffect(() => {
    if (!userId) return;
    loadTemplates();
  }, [userId]);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const q = query(templatesRef, orderBy("createdAt", "asc"));
      const snap = await getDocs(q);

      if (snap.empty) {
        // First-time user: seed with default templates
        await seedDefaults();
      } else {
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setTemplates(data);
      }
    } catch (err) {
      console.error("Failed to load templates:", err);
    } finally {
      setLoading(false);
    }
  };

  // Write the 4 default templates for a brand-new user
  const seedDefaults = async () => {
    const now = Date.now();
    const seeded = [];
    for (const t of DEFAULT_TEMPLATES) {
      const docRef = doc(templatesRef, t.id);
      const data = { ...t, createdAt: now, updatedAt: now };
      await setDoc(docRef, data);
      seeded.push(data);
    }
    setTemplates(seeded);
  };

  // Save or update a template
  const saveTemplate = async (template) => {
    const now = Date.now();
    const id = template.id || `custom-${now}`;
    const docRef = doc(templatesRef, id);
    const data = {
      ...template,
      id,
      isDefault: false,
      createdAt: template.createdAt || now,
      updatedAt: now,
    };
    await setDoc(docRef, data);
    setTemplates((prev) => {
      const exists = prev.find((t) => t.id === id);
      return exists
        ? prev.map((t) => (t.id === id ? data : t))
        : [...prev, data];
    });
    return data;
  };

  // Delete a template
  const deleteTemplate = async (id) => {
    await deleteDoc(doc(templatesRef, id));
    setTemplates((prev) => prev.filter((t) => t.id !== id));
  };

  return { templates, loading, saveTemplate, deleteTemplate, loadTemplates };
}
