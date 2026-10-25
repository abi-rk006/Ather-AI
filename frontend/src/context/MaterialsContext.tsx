import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { MaterialDocument } from '../types';
import { apiClient } from '../api/client';
import { useApp } from './AppContext';

interface MaterialsContextType {
  documents: MaterialDocument[];
  filteredDocuments: MaterialDocument[];
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  layoutMode: 'grid' | 'list';
  setLayoutMode: (mode: 'grid' | 'list') => void;
  inspectedDoc: MaterialDocument | null;
  setInspectedDoc: (doc: MaterialDocument | null) => void;
  uploadDocument: (
    file: File,
    category: MaterialDocument['category'],
    subjectId?: string,
    sourceType?: 'primary_textbook' | 'student_document',
    bookTitle?: string
  ) => Promise<MaterialDocument>;
  deleteDocument: (id: string) => Promise<void>;
  reloadDocuments: () => Promise<void>;
  isLoading: boolean;
}

const MaterialsContext = createContext<MaterialsContextType | undefined>(undefined);

export const MaterialsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { showError } = useApp();
  const [documents, setDocuments] = useState<MaterialDocument[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [layoutMode, setLayoutMode] = useState<'grid' | 'list'>('grid');
  const [inspectedDoc, setInspectedDoc] = useState<MaterialDocument | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      setIsLoading(true);
      const docs = await apiClient.getDocuments();
      setDocuments(docs);
      if (docs.length > 0 && !inspectedDoc) {
        setInspectedDoc(docs[0]);
      }
    } catch (err: any) {
      showError('Storage Retrieval Failure', 'Failed to read SQLite catalog or Chroma vectors.', err?.message);
    } finally {
      setIsLoading(false);
    }
  };

  const uploadDocument = async (
    file: File,
    category: MaterialDocument['category'],
    subjectId?: string,
    sourceType?: 'primary_textbook' | 'student_document',
    bookTitle?: string
  ) => {
    try {
      const newDoc = await apiClient.uploadDocument(file, category, subjectId, sourceType, bookTitle);
      setDocuments((prev) => [newDoc, ...prev]);
      setInspectedDoc(newDoc);
      return newDoc;
    } catch (err: any) {
      showError('Ingestion Pipeline Error', `Failed to upload "${file.name}": ${err?.message || 'Permission denied or network failure'}`);
      throw err;
    }
  };

  const deleteDocument = async (id: string) => {
    try {
      await apiClient.deleteDocument(id);
      setDocuments((prev) => prev.filter((d) => d.id !== id));
      if (inspectedDoc?.id === id) {
        setInspectedDoc(documents.find((d) => d.id !== id) || null);
      }
    } catch (err: any) {
      showError('Document Deletion Error', err?.message || 'Failed to remove vector records from Chroma and SQLite.');
    }
  };

  const filteredDocuments = documents.filter((doc) => {
    const matchesCategory = selectedCategory === 'all' || doc.category === selectedCategory;
    const matchesSearch =
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <MaterialsContext.Provider
      value={{
        documents,
        filteredDocuments,
        selectedCategory,
        setSelectedCategory,
        searchQuery,
        setSearchQuery,
        layoutMode,
        setLayoutMode,
        inspectedDoc,
        setInspectedDoc,
        uploadDocument,
        deleteDocument,
        reloadDocuments: loadDocuments,
        isLoading,
      }}
    >
      {children}
    </MaterialsContext.Provider>
  );
};

export const useMaterials = () => {
  const context = useContext(MaterialsContext);
  if (!context) throw new Error('useMaterials must be used within a MaterialsProvider');
  return context;
};
