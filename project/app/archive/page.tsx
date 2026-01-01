'use client';

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { getCurrentUser, type User } from '@/lib/auth';
import LoginModal from '@/components/LoginModal';
import ChangePasswordModal from '@/components/ChangePasswordModal';

interface Idea {
  id: string;
  title: string;
  body: string;
  created_at: string;
  user_id?: string;
}

export default function ArchivePage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIdea, setSelectedIdea] = useState<Idea | null>(null);
  const [selectedParsed, setSelectedParsed] = useState<any>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSearchQuery, setActiveSearchQuery] = useState('');
  const [formData, setFormData] = useState({
    documentTitle: '',
    name: '',
    concept: '',
    problem: '',
    coreFeatures: '',
    target: '',
    keywords: ['', ''],
    imageSlots: Array(6).fill(null as File | null),
    designTools: '',
    devTools: '',
    collaborationTools: '',
    timeline: '',
    endpoint: '',
    createdAt: '',
    updatedAt: '',
  });
  const [imagePreviews, setImagePreviews] = useState<string[]>(Array(6).fill(''));
  const [saving, setSaving] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [initialFormData, setInitialFormData] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [showFavorites, setShowFavorites] = useState(false);
  const router = useRouter();
  const contentRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLElement>(null);

  // 현재 사용자 확인
  useEffect(() => {
    const user = getCurrentUser();
    if (user) {
      setCurrentUser(user);
    }
  }, []);

  async function fetchIdeas() {
    if (!currentUser) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from('ideas')
      .select('*')
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending: false });
    if (!error && data) {
      // updatedAt 기준으로 정렬 (최근 수정된 순)
      const sortedData = data.map(idea => {
        try {
          const parsed = JSON.parse(idea.body);
          return {
            ...idea,
            updatedAt: parsed.updatedAt || idea.created_at
          };
        } catch {
          return {
            ...idea,
            updatedAt: idea.created_at
          };
        }
      }).sort((a, b) => {
        const dateA = new Date(a.updatedAt).getTime();
        const dateB = new Date(b.updatedAt).getTime();
        return dateB - dateA; // 최신순
      });
      setIdeas(sortedData);
    }
    setLoading(false);
  }

  useEffect(() => {
    if (currentUser) {
      fetchIdeas();
    }
  }, [currentUser]);

  // 최근 수정된 아이디어 상위 3개 가져오기
  const recentIdeas = ideas.slice(0, 3);

  useEffect(() => {
    fetchIdeas();
    // 로컬 스토리지에서 즐겨찾기 로드
    if (typeof window !== 'undefined') {
      const savedFavorites = localStorage.getItem('favorites');
      if (savedFavorites) {
        setFavorites(new Set(JSON.parse(savedFavorites)));
      }
    }
  }, []);

  // 즐겨찾기 저장
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('favorites', JSON.stringify(Array.from(favorites)));
    }
  }, [favorites]);

  // formData 변경 시 textarea 높이 자동 조정
  useEffect(() => {
    if (selectedIdea) {
      const textareas = document.querySelectorAll('textarea');
      textareas.forEach((textarea) => {
        (textarea as HTMLTextAreaElement).style.height = 'auto';
        (textarea as HTMLTextAreaElement).style.height = `${(textarea as HTMLTextAreaElement).scrollHeight}px`;
      });
    }
  }, [formData.problem, formData.coreFeatures, formData.timeline, formData.endpoint, selectedIdea]);

  function handleTitleClick() {
    router.push('/');
  }

  function handleIdeaClick(idea: Idea) {
    setSelectedIdea(idea);
    setShowFavorites(false);
    try {
      const parsed = JSON.parse(idea.body);
      setSelectedParsed(parsed);
      // 폼 데이터 로드
      const loadedFormData = {
        documentTitle: parsed.documentTitle || '',
        name: parsed.name || idea.title || '',
        concept: parsed.concept || '',
        problem: parsed.problem || '',
        coreFeatures: parsed.coreFeatures || '',
        target: parsed.target || '',
        keywords: parsed.keywords || ['', ''],
        imageSlots: Array(6).fill(null),
        designTools: parsed.designTools || '',
        devTools: parsed.devTools || '',
        collaborationTools: parsed.collaborationTools || '',
        timeline: parsed.timeline || '',
        endpoint: parsed.endpoint || '',
        createdAt: parsed.createdAt || idea.created_at || '',
        updatedAt: parsed.updatedAt || idea.created_at || '',
      };
      setFormData(loadedFormData);
      // 초기 데이터 저장 (변경사항 추적용)
      setInitialFormData(JSON.stringify(loadedFormData));
      // 이미지 프리뷰 로드
      if (parsed.imagePreviews && Array.isArray(parsed.imagePreviews)) {
        setImagePreviews(parsed.imagePreviews);
      } else {
        setImagePreviews(Array(6).fill(''));
      }
      // 편집 모드 초기화
      setIsEditing(false);
    } catch {
      setSelectedParsed({});
    }
  }

  function handleInputChange(field: string, value: string) {
    setFormData((prev) => {
      const updates: any = { [field]: value };
      if (field === 'documentTitle') {
        updates.updatedAt = new Date().toISOString();
      }
      return { ...prev, ...updates };
    });
  }

  function handleKeywordChange(index: number, value: string) {
    setFormData((prev) => {
      const nextKeywords = [...prev.keywords];
      nextKeywords[index] = value;
      return { ...prev, keywords: nextKeywords };
    });
  }

  function autoResizeTextarea(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
  }

  function handleFileChange(index: number, file: File | null) {
    setFormData((prev) => {
      const nextSlots = [...prev.imageSlots];
      nextSlots[index] = file;
      return { ...prev, imageSlots: nextSlots };
    });

    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviews((prev) => {
          const next = [...prev];
          next[index] = reader.result as string;
          return next;
        });
      };
      reader.readAsDataURL(file);
    } else {
      setImagePreviews((prev) => {
        const next = [...prev];
        next[index] = '';
        return next;
      });
    }
  }

  function handleMultipleFilesSelect(files: FileList | null) {
    if (!files) return;
    const fileArray = Array.from(files).slice(0, 6);
    fileArray.forEach((file, idx) => {
      if (idx < 6) {
        handleFileChange(idx, file);
      }
    });
    for (let i = fileArray.length; i < 6; i++) {
      handleFileChange(i, null);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedIdea || !formData.name.trim() || !currentUser) return;
    
    setSaving(true);
    const now = new Date().toISOString();
    const submitData = {
      ...formData,
      imagePreviews: imagePreviews,
      updatedAt: now,
    };
    
    const { error } = await supabase
      .from('ideas')
      .update({
        title: formData.name.trim(),
        body: JSON.stringify(submitData),
        user_id: currentUser.id,
      })
      .eq('id', selectedIdea.id)
      .eq('user_id', currentUser.id);
    
    if (!error) {
      await fetchIdeas();
      // 업데이트된 아이디어 다시 로드
      const { data } = await supabase
        .from('ideas')
        .select('*')
        .eq('id', selectedIdea.id)
        .eq('user_id', currentUser.id)
        .single();
      if (data) {
        handleIdeaClick(data);
        setIsEditing(false);
      }
    }
    setSaving(false);
  }

  function handleStartEdit() {
    setIsEditing(true);
  }

  function toggleFavorite(ideaId: string, e?: React.MouseEvent) {
    if (e) {
      e.stopPropagation();
    }
    setFavorites(prev => {
      const newFavorites = new Set(prev);
      if (newFavorites.has(ideaId)) {
        newFavorites.delete(ideaId);
      } else {
        newFavorites.add(ideaId);
      }
      return newFavorites;
    });
  }

  function handleFavoriteSelected() {
    // 즐겨찾기 목록 표시
    setShowFavorites(true);
    setSelectedIdea(null);
  }

  function handleOpenViewer() {
    if (selectedIdea) {
      router.push(`/archive/viewer/${selectedIdea.id}`);
    } else {
      // 선택된 아이디어가 없으면 첫 번째 아이디어로 이동
      if (ideas.length > 0) {
        router.push(`/archive/viewer/${ideas[0].id}`);
      }
    }
  }

  function handleShareClick() {
    if (!selectedIdea) return;
    setShowShareModal(true);
  }

  async function handleExportPNG() {
    if (!selectedIdea || !previewRef.current) return;
    
    try {
      setShowShareModal(false);
      // html2canvas를 동적으로 import
      const html2canvas = (await import('html2canvas')).default;
      const element = previewRef.current as HTMLElement;
      const canvas = await html2canvas(element, {
        backgroundColor: '#ffffff',
        scale: 2,
      });
      
      // PNG 다운로드
      const link = document.createElement('a');
      link.download = `${formData.documentTitle || selectedIdea.title || 'idea'}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('Export failed:', error);
      alert('이미지 내보내기에 실패했습니다.');
    }
  }

  async function handleExportPDF() {
    if (!selectedIdea || !previewRef.current) return;
    
    try {
      setShowShareModal(false);
      // html2canvas와 jsPDF를 동적으로 import
      const html2canvas = (await import('html2canvas')).default;
      const jsPDF = (await import('jspdf')).default;
      const element = previewRef.current as HTMLElement;
      const canvas = await html2canvas(element, {
        backgroundColor: '#ffffff',
        scale: 2,
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      
      let position = 0;
      
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      
      pdf.save(`${formData.documentTitle || selectedIdea.title || 'idea'}.pdf`);
    } catch (error) {
      console.error('Export failed:', error);
      alert('PDF 내보내기에 실패했습니다.');
    }
  }

  function handleShareLink() {
    // 목업 기능 - 실제 구현은 나중에
    if (selectedIdea) {
      const link = `${window.location.origin}/archive/viewer/${selectedIdea.id}`;
      navigator.clipboard.writeText(link).then(() => {
        alert('링크가 클립보드에 복사되었습니다.');
        setShowShareModal(false);
      }).catch(() => {
        alert('링크 복사에 실패했습니다.');
      });
    }
  }

  // 폼 데이터 변경 여부 확인
  const hasChanges = initialFormData && JSON.stringify({
    ...formData,
    imagePreviews: imagePreviews,
  }) !== initialFormData;

  async function handleDelete(id: string, e?: React.MouseEvent) {
    if (e) {
      e.stopPropagation();
    }
    if (!confirm('정말 이 아이디어를 삭제하시겠습니까?') || !currentUser) return;
    
    setDeletingId(id);
    const { error } = await supabase
      .from('ideas')
      .delete()
      .eq('id', id)
      .eq('user_id', currentUser.id);
    if (!error) {
      fetchIdeas();
      if (selectedIdea?.id === id) {
        setSelectedIdea(null);
        setSelectedParsed(null);
      }
    }
    setDeletingId(null);
  }

  function filterIdeas(ideas: Idea[], query: string): Idea[] {
    if (!query.trim()) return ideas;
    
    const lowerQuery = query.toLowerCase();
    return ideas.filter((idea) => {
      try {
        const parsed = JSON.parse(idea.body);
        const searchFields = [
          idea.title || '',
          parsed.documentTitle || '',
          parsed.concept || '',
          parsed.problem || '',
          parsed.coreFeatures || '',
          parsed.target || '',
        ];
        
        return searchFields.some(field => 
          field.toLowerCase().includes(lowerQuery)
        );
      } catch {
        return (idea.title || '').toLowerCase().includes(lowerQuery) ||
               (idea.body || '').toLowerCase().includes(lowerQuery);
      }
    });
  }

  function handleSearch() {
    setActiveSearchQuery(searchQuery);
  }

  function handleClearSearch() {
    setSearchQuery('');
    setActiveSearchQuery('');
  }

  function handleKeyPress(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      handleSearch();
    }
  }

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    setShowLoginModal(false);
    fetchIdeas();
  };

  const handlePasswordChangeSuccess = () => {
    const user = getCurrentUser();
    if (user) {
      setCurrentUser(user);
    }
  };

  // 로그인하지 않았으면 로그인 화면 표시
  if (!currentUser) {
    return (
      <>
        <main className="min-h-screen bg-white text-gray-900 px-4 py-12 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-4">📝 Idea Archive</h1>
            <p className="text-gray-600 mb-4">로그인이 필요합니다.</p>
            <button
              onClick={() => setShowLoginModal(true)}
              className="bg-black text-white px-6 py-2 rounded hover:bg-gray-900 transition font-medium"
            >
              로그인
            </button>
          </div>
        </main>
        {showLoginModal && (
          <LoginModal
            onSuccess={handleLoginSuccess}
            onClose={() => setShowLoginModal(false)}
          />
        )}
      </>
    );
  }

  return (
    <main className="min-h-screen bg-white text-gray-900 px-4 py-12">
      <div className="w-full max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div className="text-3xl font-extrabold tracking-tight text-left">
            📝 Idea Archive
          </div>
          <button
            type="button"
            onClick={handleTitleClick}
            className="text-lg text-gray-600 hover:text-gray-900 transition-colors"
          >
            Get Creative
          </button>
        </div>

        <div className="flex flex-col lg:flex-row gap-3">
          {/* 왼쪽: 아이디어 목록 */}
          <div className="relative max-w-[21rem] lg:flex-shrink-0 lg:mr-3">
            {/* 검색창 */}
            <div className="mb-4">
              <div className="relative flex items-center">
                <input
                  type="text"
                  placeholder="검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="w-full px-3 py-2 pr-20 border border-gray-200 rounded focus:outline-none focus:border-gray-900 focus:ring-0 bg-white placeholder:text-gray-400 transition-colors"
                />
                <div className="absolute right-2 flex items-center gap-1">
                  {activeSearchQuery && (
                    <button
                      onClick={handleClearSearch}
                      className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                      title="검색 초기화"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  )}
                  <button
                    onClick={handleSearch}
                    className="p-1 text-gray-400 hover:text-gray-900 transition-colors"
                    title="검색"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
            <div
              ref={contentRef}
              className="max-h-[calc(100vh-200px)] overflow-y-auto space-y-3 pr-2 archive-scrollbar"
            >
              {loading ? (
                <div className="text-gray-500 text-center py-8">Loading...</div>
              ) : (() => {
                const filteredIdeas = filterIdeas(ideas, activeSearchQuery);
                if (filteredIdeas.length === 0) {
                  return (
                    <div className="text-gray-400 text-center py-8">
                      {activeSearchQuery ? '검색 결과가 없습니다.' : '아이디어가 없습니다.'}
                    </div>
                  );
                }
                return (
                  <ul className="space-y-3">
                    {filteredIdeas.map((idea) => {
                      let parsed: any = {};
                      try {
                        parsed = JSON.parse(idea.body);
                      } catch {}
                      
                      const isSelected = selectedIdea?.id === idea.id;
                      
                      return (
                        <li
                          key={idea.id}
                          onClick={() => handleIdeaClick(idea)}
                          className={`bg-white border rounded-lg p-4 shadow-sm cursor-pointer transition-colors relative ${
                            isSelected ? 'border-gray-900 bg-gray-50' : 'border-gray-200 hover:shadow-md'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={(e) => toggleFavorite(idea.id, e)}
                            className="absolute top-2 right-2 z-10 p-1 hover:bg-gray-100 rounded transition-colors"
                            title={favorites.has(idea.id) ? '즐겨찾기 해제' : '즐겨찾기 추가'}
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className={`h-5 w-5 ${favorites.has(idea.id) ? 'text-yellow-500 fill-yellow-500' : 'text-gray-400'}`}
                              viewBox="0 0 24 24"
                              fill={favorites.has(idea.id) ? 'currentColor' : 'none'}
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                              />
                            </svg>
                          </button>
                          <div className="mb-2 pr-6">
                            <div className="font-semibold text-lg">{idea.title || parsed.documentTitle || '제목 없음'}</div>
                          </div>
                          {idea.body && (
                            <div className="text-gray-700 mt-1 relative overflow-hidden">
                              <div className="text-sm space-y-2 whitespace-nowrap">
                                {(() => {
                                  try {
                                    return (
                                      <>
                                        {parsed.concept && (
                                          <div className="truncate">
                                            <strong>Concept:</strong> <span className="truncate">{parsed.concept}</span>
                                          </div>
                                        )}
                                        {parsed.problem && (
                                          <div className="truncate">
                                            <strong>Problem:</strong> <span className="truncate">{parsed.problem}</span>
                                          </div>
                                        )}
                                        {parsed.coreFeatures && (
                                          <div className="truncate">
                                            <strong>핵심 기능:</strong> <span className="truncate">{parsed.coreFeatures}</span>
                                          </div>
                                        )}
                                        {parsed.target && (
                                          <div className="truncate">
                                            <strong>타겟:</strong> <span className="truncate">{parsed.target}</span>
                                          </div>
                                        )}
                                      </>
                                    );
                                  } catch {
                                    return <div className="truncate">{idea.body}</div>;
                                  }
                                })()}
                              </div>
                              <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent pointer-events-none"></div>
                            </div>
                          )}
                          <div className="text-xs text-gray-400 mt-2">
                            {idea.created_at
                              ? new Date(idea.created_at).toLocaleString('ko-KR')
                              : ''}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                );
              })()}
            </div>
          </div>

          {/* 오른쪽: 미리보기와 검정색 모듈 */}
          <div className="flex gap-3 flex-1 items-start">
            <div className="lg:sticky lg:top-12 lg:h-[calc(100vh-120px)] flex-1 max-w-2xl">
              {showFavorites ? (
                <div className="bg-white border border-gray-400 rounded-lg p-6 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.1),-4px_0_8px_-4px_rgba(0,0,0,0.1)] h-full overflow-y-auto archive-scrollbar">
                  <h3 className="text-xl font-semibold mb-4">Ideas to Revisit</h3>
                  {favorites.size === 0 ? (
                    <div className="text-gray-400 text-center py-8">아이디어가 없습니다.</div>
                  ) : (
                    <div className="space-y-4">
                      {ideas
                        .filter(idea => favorites.has(idea.id))
                        .map((idea) => {
                          let parsed: any = {};
                          try {
                            parsed = JSON.parse(idea.body);
                          } catch {}
                          
                          return (
                            <div
                              key={idea.id}
                              className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                              onClick={() => {
                                handleIdeaClick(idea);
                                setShowFavorites(false);
                              }}
                            >
                              <div className="font-semibold text-lg mb-2">
                                {idea.title || parsed.documentTitle || parsed.name || '제목 없음'}
                              </div>
                              {parsed.concept && (
                                <div className="text-sm text-gray-600 mb-1">
                                  <strong>Concept:</strong> {parsed.concept}
                                </div>
                              )}
                              {parsed.problem && (
                                <div className="text-sm text-gray-600 mb-1 line-clamp-2">
                                  <strong>Problem:</strong> {parsed.problem}
                                </div>
                              )}
                              {parsed.coreFeatures && (
                                <div className="text-sm text-gray-600 mb-1 line-clamp-1">
                                  <strong>핵심 기능:</strong> {parsed.coreFeatures}
                                </div>
                              )}
                              {parsed.target && (
                                <div className="text-sm text-gray-600 mb-1">
                                  <strong>타겟:</strong> {parsed.target}
                                </div>
                              )}
                              {parsed.imagePreviews && parsed.imagePreviews.length > 0 && parsed.imagePreviews[0] && (
                                <div className="mt-3">
                                  <img
                                    src={parsed.imagePreviews[0]}
                                    alt="미리보기"
                                    className="w-full h-32 object-cover rounded"
                                  />
                                </div>
                              )}
                              <div className="text-xs text-gray-400 mt-2">
                                {parsed.updatedAt
                                  ? `최근 수정: ${new Date(parsed.updatedAt).toLocaleString('ko-KR')}`
                                  : idea.created_at
                                  ? `생성: ${new Date(idea.created_at).toLocaleString('ko-KR')}`
                                  : ''}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              ) : selectedIdea ? (
                isEditing ? (
                  <form onSubmit={handleSubmit} className="bg-white border border-gray-400 rounded-lg p-6 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.1),-4px_0_8px_-4px_rgba(0,0,0,0.1)] h-full overflow-y-auto archive-scrollbar">
                    <div ref={previewRef as React.RefObject<HTMLDivElement>}>
                  <div className="space-y-3">
                    {/* 문서 제목 */}
                    <div className="mb-4">
                      <input
                        className="w-full text-2xl font-bold mb-2 px-3 py-2 border border-gray-200 rounded focus:outline-none focus:border-gray-900 focus:ring-0 bg-white placeholder:text-gray-400 transition-colors"
                        placeholder="아이디어를 기록해보세요"
                        value={formData.documentTitle}
                        onChange={(e) => handleInputChange('documentTitle', e.target.value)}
                      />
                      <div className="flex justify-between items-center gap-4 text-xs text-gray-400 mt-1">
                        <div className="flex gap-4">
                          {formData.createdAt && (
                            <span>최초등록일: {new Date(formData.createdAt).toLocaleString('ko-KR')}</span>
                          )}
                          {formData.updatedAt && (
                            <span>최근 수정일: {new Date(formData.updatedAt).toLocaleString('ko-KR')}</span>
                          )}
                        </div>
                        {/* 저장/삭제 버튼 */}
                        <div className="flex items-center gap-2">
                          <button
                            type="submit"
                            disabled={saving || !formData.name.trim() || !hasChanges}
                            className="text-gray-600 hover:text-blue-600 transition-colors flex items-center gap-1 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            title="저장"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-4 w-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                              />
                            </svg>
                            {saving ? '저장 중...' : '저장'}
                          </button>
                          <span className="text-gray-400">·</span>
                          <button
                            type="button"
                            onClick={() => handleDelete(selectedIdea.id)}
                            disabled={deletingId === selectedIdea.id}
                            className="text-gray-600 hover:text-red-600 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            title="삭제"
                          >
                            {deletingId === selectedIdea.id ? '삭제 중...' : '삭제'}
                          </button>
                        </div>
                      </div>
                    </div>
                  
                  {/* 구분선 */}
                  <div className="border-b border-gray-300 mb-3"></div>
                  
                  {/* 1. Naming & Concept */}
                  <div className="border-b border-gray-200 pb-2">
                    <h3 className="text-lg font-semibold mb-2">1. Naming & Concept</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium mb-1">제목:</label>
                        <input
                          className="w-full px-3 py-2 border border-gray-200 rounded focus:outline-none focus:border-gray-900 focus:ring-0 bg-white placeholder:text-gray-400 transition-colors"
                          placeholder="부르기 쉽고 기억에 남는 가제"
                          value={formData.name}
                          onChange={(e) => handleInputChange('name', e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">슬로건:</label>
                        <input
                          className="w-full px-3 py-2 border border-gray-200 rounded focus:outline-none focus:border-gray-900 focus:ring-0 bg-white placeholder:text-gray-400 transition-colors"
                          placeholder="무엇을 위해, 무엇을 만드는가?"
                          value={formData.concept}
                          onChange={(e) => handleInputChange('concept', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  {/* 2. Problem & Motivation */}
                  <div className="border-b border-gray-200 pb-2">
                    <h3 className="text-lg font-semibold mb-2">2. Problem & Motivation</h3>
                    <textarea
                      className="w-full px-3 py-2 border border-gray-200 rounded focus:outline-none focus:border-gray-900 focus:ring-0 bg-white placeholder:text-gray-400 resize-none transition-colors min-h-[80px] overflow-hidden"
                      placeholder="문제점과 동기를 작성하세요"
                      value={formData.problem}
                      onChange={(e) => {
                        handleInputChange('problem', e.target.value);
                        autoResizeTextarea(e);
                      }}
                    />
                  </div>

                  {/* 3. MVP & Audience */}
                  <div className="border-b border-gray-200 pb-2">
                    <h3 className="text-lg font-semibold mb-2">3. MVP & Audience</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium mb-1">핵심 기능:</label>
                        <textarea
                          className="w-full px-3 py-2 border border-gray-200 rounded focus:outline-none focus:border-gray-900 focus:ring-0 bg-white placeholder:text-gray-400 resize-none transition-colors min-h-[60px] overflow-hidden"
                          placeholder="핵심 기능을 작성하세요"
                          value={formData.coreFeatures}
                          onChange={(e) => {
                            handleInputChange('coreFeatures', e.target.value);
                            autoResizeTextarea(e);
                          }}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">타겟:</label>
                        <input
                          className="w-full px-3 py-2 border border-gray-200 rounded focus:outline-none focus:border-gray-900 focus:ring-0 bg-white placeholder:text-gray-400 transition-colors"
                          placeholder="타겟 사용자를 작성하세요"
                          value={formData.target}
                          onChange={(e) => handleInputChange('target', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  {/* 4. Visual & Style */}
                  <div className="border-b border-gray-200 pb-2">
                    <h3 className="text-lg font-semibold mb-2">4. Visual & Style</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium mb-2">키워드:</label>
                        <div className="space-y-2">
                          {formData.keywords.map((keyword, idx) => (
                            <input
                              key={idx}
                              className="w-full px-3 py-2 border border-gray-200 rounded focus:outline-none focus:border-gray-900 focus:ring-0 bg-white placeholder:text-gray-400 transition-colors"
                              placeholder={`키워드 ${idx + 1}`}
                              value={keyword}
                              onChange={(e) => handleKeywordChange(idx, e.target.value)}
                            />
                          ))}
                        </div>
                      </div>

                      <div>
                        <div className="block text-sm font-medium mb-2">참고할 이미지 / 톤앤매너</div>
                        <div className="grid grid-cols-6 gap-2 mb-3">
                          {formData.imageSlots.map((slot, idx) => (
                            <div
                              key={idx}
                              className="relative border border-gray-200 rounded-md overflow-hidden aspect-square"
                            >
                              {imagePreviews[idx] && (
                                <button
                                  type="button"
                                  onClick={() => handleFileChange(idx, null)}
                                  className="absolute top-1 right-1 z-10 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold hover:bg-red-700 transition-colors shadow-md"
                                  title="삭제"
                                >
                                  ×
                                </button>
                              )}
                              <div className="w-full h-full rounded border border-dashed border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden">
                                {imagePreviews[idx] ? (
                                  <img
                                    src={imagePreviews[idx]}
                                    alt={`slot-${idx + 1}`}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <span className="text-xs text-gray-400">미리보기</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <label className="cursor-pointer flex-1">
                            <input
                              type="file"
                              accept="image/*"
                              multiple
                              className="hidden"
                              onChange={(e) => handleMultipleFilesSelect(e.target.files)}
                            />
                            <div className="w-full px-4 py-2 border border-gray-200 rounded focus-within:border-gray-900 bg-white text-sm text-center text-gray-600 hover:bg-gray-50 transition-colors">
                              파일 선택 (최대 6개)
                            </div>
                          </label>
                          <button
                            type="button"
                            onClick={() => setShowImageModal(true)}
                            disabled={!imagePreviews.some(preview => preview)}
                            className="px-4 py-2 border border-gray-200 rounded bg-white text-sm text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                            title={imagePreviews.some(preview => preview) ? "확대 보기" : "이미지를 삽입해주세요."}
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 5. Tool & Stack */}
                  <div className="border-b border-gray-200 pb-2">
                    <h3 className="text-lg font-semibold mb-2">5. Tool & Stack</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium mb-1">디자인:</label>
                        <input
                          className="w-full px-3 py-2 border border-gray-200 rounded focus:outline-none focus:border-gray-900 focus:ring-0 bg-white placeholder:text-gray-400 transition-colors"
                          placeholder="디자인 도구를 작성하세요"
                          value={formData.designTools}
                          onChange={(e) => handleInputChange('designTools', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">개발/구축:</label>
                        <input
                          className="w-full px-3 py-2 border border-gray-200 rounded focus:outline-none focus:border-gray-900 focus:ring-0 bg-white placeholder:text-gray-400 transition-colors"
                          placeholder="개발/구축 도구를 작성하세요"
                          value={formData.devTools}
                          onChange={(e) => handleInputChange('devTools', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">협업/기록:</label>
                        <input
                          className="w-full px-3 py-2 border border-gray-200 rounded focus:outline-none focus:border-gray-900 focus:ring-0 bg-white placeholder:text-gray-400 transition-colors"
                          placeholder="협업/기록 도구를 작성하세요"
                          value={formData.collaborationTools}
                          onChange={(e) => handleInputChange('collaborationTools', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  {/* 6. Timeline & Milestone */}
                  <div className="border-b border-gray-200 pb-2">
                    <h3 className="text-lg font-semibold mb-2">6. Timeline & Milestone</h3>
                    <textarea
                      className="w-full px-3 py-2 border border-gray-200 rounded focus:outline-none focus:border-gray-900 focus:ring-0 bg-white placeholder:text-gray-400 resize-none transition-colors min-h-[80px] overflow-hidden"
                      placeholder="타임라인과 마일스톤을 작성하세요"
                      value={formData.timeline}
                      onChange={(e) => {
                        handleInputChange('timeline', e.target.value);
                        autoResizeTextarea(e);
                      }}
                    />
                  </div>

                  {/* 7. Endpoint & Goal */}
                  <div className="pb-2">
                    <h3 className="text-lg font-semibold mb-2">7. Endpoint & Goal</h3>
                    <textarea
                      className="w-full px-3 py-2 border border-gray-200 rounded focus:outline-none focus:border-gray-900 focus:ring-0 bg-white placeholder:text-gray-400 resize-none transition-colors min-h-[80px] overflow-hidden"
                      placeholder="엔드포인트와 목표를 작성하세요"
                      value={formData.endpoint}
                      onChange={(e) => {
                        handleInputChange('endpoint', e.target.value);
                        autoResizeTextarea(e);
                      }}
                    />
                  </div>
                </div>
                    </div>
              </form>
                ) : (
                  <div ref={previewRef as React.RefObject<HTMLDivElement>} className="bg-white border border-gray-400 rounded-lg p-6 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.1),-4px_0_8px_-4px_rgba(0,0,0,0.1)] h-full overflow-y-auto archive-scrollbar">
                    <div className="space-y-3">
                      {/* 문서 제목 */}
                      <div className="mb-4">
                        <div className="w-full text-2xl font-bold mb-2 px-3 py-2">
                          {formData.documentTitle || '제목 없음'}
                        </div>
                        <div className="flex justify-between items-center gap-4 text-xs text-gray-400 mt-1">
                          <div className="flex gap-4">
                            {formData.createdAt && (
                              <span>최초등록일: {new Date(formData.createdAt).toLocaleString('ko-KR')}</span>
                            )}
                            {formData.updatedAt && (
                              <span>최근 수정일: {new Date(formData.updatedAt).toLocaleString('ko-KR')}</span>
                            )}
                          </div>
                          {/* 수정/삭제 버튼 */}
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={handleStartEdit}
                              className="text-gray-600 hover:text-blue-600 transition-colors flex items-center gap-1 text-sm"
                              title="수정"
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-4 w-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                />
                              </svg>
                              수정
                            </button>
                            <span className="text-gray-400">·</span>
                            <button
                              type="button"
                              onClick={() => handleDelete(selectedIdea.id)}
                              disabled={deletingId === selectedIdea.id}
                              className="text-gray-600 hover:text-red-600 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                              title="삭제"
                            >
                              {deletingId === selectedIdea.id ? '삭제 중...' : '삭제'}
                            </button>
                          </div>
                        </div>
                      </div>
                      
                      {/* 구분선 */}
                      <div className="border-b border-gray-300 mb-3"></div>
                      
                      {/* 1. Naming & Concept */}
                      <div className="border-b border-gray-200 pb-2">
                        <h3 className="text-lg font-semibold mb-2">1. Naming & Concept</h3>
                        <div className="space-y-3">
                          <div>
                            <label className="block text-sm font-medium mb-1">제목:</label>
                            <div className="px-3 py-2 text-gray-900">{formData.name || '-'}</div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1">슬로건:</label>
                            <div className="px-3 py-2 text-gray-900">{formData.concept || '-'}</div>
                          </div>
                        </div>
                      </div>

                      {/* 2. Problem & Motivation */}
                      <div className="border-b border-gray-200 pb-2">
                        <h3 className="text-lg font-semibold mb-2">2. Problem & Motivation</h3>
                        <div className="px-3 py-2 text-gray-900 whitespace-pre-wrap">{formData.problem || '-'}</div>
                      </div>

                      {/* 3. MVP & Audience */}
                      <div className="border-b border-gray-200 pb-2">
                        <h3 className="text-lg font-semibold mb-2">3. MVP & Audience</h3>
                        <div className="space-y-3">
                          <div>
                            <label className="block text-sm font-medium mb-1">핵심 기능:</label>
                            <div className="px-3 py-2 text-gray-900 whitespace-pre-wrap">{formData.coreFeatures || '-'}</div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1">타겟:</label>
                            <div className="px-3 py-2 text-gray-900">{formData.target || '-'}</div>
                          </div>
                        </div>
                      </div>

                      {/* 4. Visual & Style */}
                      <div className="border-b border-gray-200 pb-2">
                        <h3 className="text-lg font-semibold mb-2">4. Visual & Style</h3>
                        <div className="space-y-3">
                          <div>
                            <label className="block text-sm font-medium mb-2">키워드:</label>
                            <div className="space-y-2">
                              {formData.keywords.map((keyword, idx) => (
                                <div key={idx} className="px-3 py-2 text-gray-900">
                                  {keyword || '-'}
                                </div>
                              ))}
                            </div>
                          </div>

                          <div>
                            <div className="block text-sm font-medium mb-2">참고할 이미지 / 톤앤매너</div>
                            <div className="grid grid-cols-6 gap-2 mb-3">
                              {imagePreviews.map((preview, idx) => (
                                <div
                                  key={idx}
                                  className="relative border border-gray-200 rounded-md overflow-hidden aspect-square"
                                >
                                  <div className="w-full h-full rounded border border-dashed border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden">
                                    {preview ? (
                                      <img
                                        src={preview}
                                        alt={`slot-${idx + 1}`}
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      <span className="text-xs text-gray-400">미리보기</span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                            {imagePreviews.some(preview => preview) && (
                              <button
                                type="button"
                                onClick={() => setShowImageModal(true)}
                                className="px-4 py-2 border border-gray-200 rounded bg-white text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                              >
                                확대 보기
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* 5. Tool & Stack */}
                      <div className="border-b border-gray-200 pb-2">
                        <h3 className="text-lg font-semibold mb-2">5. Tool & Stack</h3>
                        <div className="space-y-3">
                          <div>
                            <label className="block text-sm font-medium mb-1">디자인:</label>
                            <div className="px-3 py-2 text-gray-900">{formData.designTools || '-'}</div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1">개발/구축:</label>
                            <div className="px-3 py-2 text-gray-900">{formData.devTools || '-'}</div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1">협업/기록:</label>
                            <div className="px-3 py-2 text-gray-900">{formData.collaborationTools || '-'}</div>
                          </div>
                        </div>
                      </div>

                      {/* 6. Timeline & Milestone */}
                      <div className="border-b border-gray-200 pb-2">
                        <h3 className="text-lg font-semibold mb-2">6. Timeline & Milestone</h3>
                        <div className="px-3 py-2 text-gray-900 whitespace-pre-wrap">{formData.timeline || '-'}</div>
                      </div>

                      {/* 7. Endpoint & Goal */}
                      <div className="pb-2">
                        <h3 className="text-lg font-semibold mb-2">7. Endpoint & Goal</h3>
                        <div className="px-3 py-2 text-gray-900 whitespace-pre-wrap">{formData.endpoint || '-'}</div>
                      </div>
                    </div>
                  </div>
                )
              ) : (
                <div className="bg-white border border-gray-400 rounded-lg p-6 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.1),-4px_0_8px_-4px_rgba(0,0,0,0.1)] h-full overflow-y-auto archive-scrollbar">
                  <h3 className="text-xl font-semibold mb-4">Recent Ideas</h3>
                  {loading ? (
                    <div className="text-gray-500 text-center py-8">Loading...</div>
                  ) : recentIdeas.length === 0 ? (
                    <div className="text-gray-400 text-center py-8">아이디어가 없습니다.</div>
                  ) : (
                    <div className="space-y-4">
                      {recentIdeas.map((idea) => {
                        let parsed: any = {};
                        try {
                          parsed = JSON.parse(idea.body);
                        } catch {}
                        
                        return (
                          <div
                            key={idea.id}
                            className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                            onClick={() => handleIdeaClick(idea)}
                          >
                            <div className="font-semibold text-lg mb-2">
                              {idea.title || parsed.documentTitle || parsed.name || '제목 없음'}
                            </div>
                            {parsed.concept && (
                              <div className="text-sm text-gray-600 mb-1">
                                <strong>Concept:</strong> {parsed.concept}
                              </div>
                            )}
                            {parsed.problem && (
                              <div className="text-sm text-gray-600 mb-1 line-clamp-2">
                                <strong>Problem:</strong> {parsed.problem}
                              </div>
                            )}
                            {parsed.coreFeatures && (
                              <div className="text-sm text-gray-600 mb-1 line-clamp-1">
                                <strong>핵심 기능:</strong> {parsed.coreFeatures}
                              </div>
                            )}
                            {parsed.target && (
                              <div className="text-sm text-gray-600 mb-1">
                                <strong>타겟:</strong> {parsed.target}
                              </div>
                            )}
                            {parsed.imagePreviews && parsed.imagePreviews.length > 0 && parsed.imagePreviews[0] && (
                              <div className="mt-3">
                                <img
                                  src={parsed.imagePreviews[0]}
                                  alt="미리보기"
                                  className="w-full h-32 object-cover rounded"
                                />
                              </div>
                            )}
                            <div className="text-xs text-gray-400 mt-2">
                              {parsed.updatedAt
                                ? `최근 수정: ${new Date(parsed.updatedAt).toLocaleString('ko-KR')}`
                                : idea.created_at
                                ? `생성: ${new Date(idea.created_at).toLocaleString('ko-KR')}`
                                : ''}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 오른쪽 끝: 검정색 모듈 */}
            <div className="lg:sticky lg:top-12 lg:h-auto lg:flex-shrink-0 hidden lg:flex flex-col items-center justify-between gap-3 bg-black rounded-lg p-4">
            <div className="flex flex-col items-center gap-3">
              <button
                onClick={handleFavoriteSelected}
                className="w-12 h-12 border-[1.5px] border-[#d1d5db] rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors"
                title="Ideas to Revisit"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 text-[#d1d5db]"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                  />
                </svg>
              </button>
              <button
                onClick={handleOpenViewer}
                className="w-12 h-12 border-[1.5px] border-[#d1d5db] rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors"
                title="새로운 아이디어 뷰어"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 text-[#d1d5db]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
              </button>
              <button
                onClick={handleShareClick}
                disabled={!selectedIdea}
                className="w-12 h-12 border-[1.5px] border-[#d1d5db] rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="공유"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 text-[#d1d5db]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                  />
                </svg>
              </button>
            </div>
            <button
              onClick={() => setShowChangePasswordModal(true)}
              className="w-12 h-12 border-[1.5px] border-[#d1d5db] rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors"
              title="계정 설정"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 text-[#d1d5db]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </button>
          </div>
        </div>
        </div>
      </div>

      {/* 공유 모달 */}
      {showShareModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowShareModal(false)}
        >
          <div
            className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold">공유하기</h3>
              <button
                type="button"
                onClick={() => setShowShareModal(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl font-bold transition-colors"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-3">
              <button
                onClick={handleExportPNG}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg hover:border-gray-900 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <span className="font-medium">PNG로 다운로드</span>
              </button>
              
              <button
                onClick={handleExportPDF}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg hover:border-gray-900 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                  />
                </svg>
                <span className="font-medium">PDF로 다운로드</span>
              </button>
              
              <button
                onClick={handleShareLink}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg hover:border-gray-900 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                  />
                </svg>
                <span className="font-medium">Share Link</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 이미지 확대 모달 */}
      {showImageModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={() => setShowImageModal(false)}
        >
          <div
            className="bg-white rounded-lg max-w-4xl max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 flex justify-between items-center">
              <h3 className="text-lg font-semibold">이미지 확대 보기</h3>
              <button
                type="button"
                onClick={() => setShowImageModal(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
              >
                ×
              </button>
            </div>
            <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-4">
              {imagePreviews.map((preview, idx) => (
                preview && (
                  <div key={idx} className="relative">
                    <img
                      src={preview}
                      alt={`확대-${idx + 1}`}
                      className="w-full h-auto rounded border border-gray-200"
                    />
                  </div>
                )
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 로그인 모달 */}
      {showLoginModal && (
        <LoginModal
          onSuccess={handleLoginSuccess}
          onClose={() => setShowLoginModal(false)}
        />
      )}

      {/* 비밀번호 변경 모달 */}
      {showChangePasswordModal && currentUser && (
        <ChangePasswordModal
          currentUser={currentUser}
          onSuccess={handlePasswordChangeSuccess}
          onClose={() => setShowChangePasswordModal(false)}
        />
      )}
    </main>
  );
}
