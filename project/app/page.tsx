'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getCurrentUser, type User } from '@/lib/auth';
import LoginModal from '@/components/LoginModal';

interface Idea {
  id: string;
  title: string;
  body: string;
  created_at: string;
  user_id?: string;
}

export default function Home() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [ideas, setIdeas] = useState<Idea[]>([]);
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
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const router = useRouter();
  const previewRef = useRef<HTMLFormElement>(null);

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
    if (!error && data) setIdeas(data);
    setLoading(false);
  }

  useEffect(() => {
    if (currentUser) {
      fetchIdeas();
    }
  }, [currentUser]);

  useEffect(() => {
    // 폼 로드 시 최초등록일 설정 (편집 모드가 아닐 때만)
    if (!formData.createdAt && !editingId) {
      setFormData((prev) => ({
        ...prev,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));
    }

    // 로컬 스토리지에서 즐겨찾기 로드
    if (typeof window !== 'undefined') {
      const savedFavorites = localStorage.getItem('favorites');
      if (savedFavorites) {
        setFavorites(new Set(JSON.parse(savedFavorites)));
      }
    }
  }, [editingId]);

  // 즐겨찾기 저장
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('favorites', JSON.stringify(Array.from(favorites)));
    }
  }, [favorites]);

  // URL 파라미터나 세션 스토리지에서 편집할 아이디어 확인
  useEffect(() => {
    if (ideas.length > 0 && typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const editId = urlParams.get('edit') || sessionStorage.getItem('editIdeaId');
      if (editId && !editingId) {
        const ideaToEdit = ideas.find(idea => idea.id === editId);
        if (ideaToEdit) {
          loadIdeaToForm(ideaToEdit);
          sessionStorage.removeItem('editIdeaId');
        }
      }
    }
  }, [ideas]);

  // formData 변경 시 textarea 높이 자동 조정
  useEffect(() => {
    const textareas = document.querySelectorAll('textarea');
    textareas.forEach((textarea) => {
      (textarea as HTMLTextAreaElement).style.height = 'auto';
      (textarea as HTMLTextAreaElement).style.height = `${(textarea as HTMLTextAreaElement).scrollHeight}px`;
    });
  }, [formData.problem, formData.coreFeatures, formData.timeline, formData.endpoint]);

  function resetForm() {
    setFormData({
      documentTitle: '',
      name: '',
      concept: '',
      problem: '',
      coreFeatures: '',
      target: '',
      keywords: ['', ''],
      imageSlots: Array(6).fill(null),
      designTools: '',
      devTools: '',
      collaborationTools: '',
      timeline: '',
      endpoint: '',
      createdAt: '',
      updatedAt: '',
    });
    setImagePreviews(Array(6).fill(''));
    setEditingId(null);
  }

  function loadIdeaToForm(idea: Idea) {
    try {
      const parsed = JSON.parse(idea.body);
      setFormData({
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
      });
      
      // 이미지 프리뷰는 파일이 아니므로 저장된 URL이 있다면 표시
      if (parsed.imagePreviews && Array.isArray(parsed.imagePreviews)) {
        setImagePreviews(parsed.imagePreviews);
      } else {
        setImagePreviews(Array(6).fill(''));
      }
      
      setEditingId(idea.id);
      
      // 폼으로 스크롤
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      console.error('Failed to parse idea:', error);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.name.trim() || !currentUser) return;
    
    const now = new Date().toISOString();
    const submitData = {
      ...formData,
      imagePreviews: imagePreviews, // 이미지 프리뷰도 저장
      createdAt: formData.createdAt || now,
      updatedAt: now,
    };
    
    if (editingId) {
      // 업데이트
      const { error } = await supabase
        .from('ideas')
        .update({
          title: formData.name.trim(),
          body: JSON.stringify(submitData),
          user_id: currentUser.id,
        })
        .eq('id', editingId)
        .eq('user_id', currentUser.id);
      
      if (!error) {
        resetForm();
        fetchIdeas();
      }
    } else {
      // 새로 생성
      const { error } = await supabase.from('ideas').insert([
        {
          title: formData.name.trim(),
          body: JSON.stringify(submitData),
          user_id: currentUser.id,
        },
      ]);
      
      if (!error) {
        resetForm();
        fetchIdeas();
      }
    }
  }

  function handleInputChange(field: string, value: string) {
    setFormData((prev) => {
      const updates: any = { [field]: value };
      // documentTitle 변경 시 updatedAt 업데이트
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
    
    const fileArray = Array.from(files).slice(0, 6); // 최대 6개까지만
    
    fileArray.forEach((file, idx) => {
      if (idx < 6) {
        handleFileChange(idx, file);
      }
    });
    
    // 나머지 슬롯은 비우기
    for (let i = fileArray.length; i < 6; i++) {
      handleFileChange(i, null);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('정말 이 아이디어를 삭제하시겠습니까?') || !currentUser) return;
    
    setDeletingId(id);
    const { error } = await supabase
      .from('ideas')
      .delete()
      .eq('id', id)
      .eq('user_id', currentUser.id);
    if (!error) {
      fetchIdeas();
    }
    setDeletingId(null);
  }

  function startNewIdea() {
    resetForm();
    // URL에서 edit 파라미터 제거
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('edit');
      window.history.replaceState({}, '', url.pathname);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function toggleFavorite(ideaId: string) {
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

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    setShowLoginModal(false);
    fetchIdeas();
  };

  // 로그인하지 않았으면 로그인 화면 표시
  if (!currentUser) {
    return (
      <>
        <main className="bg-white text-gray-900 flex flex-col items-center px-4 py-12 overflow-visible">
          <div className="w-full max-w-7xl mx-auto">
            <div className="flex justify-center items-center min-h-[60vh]">
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
            </div>
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
    <main className="bg-white text-gray-900 flex flex-col items-center px-4 py-12 overflow-visible">
      <div className="w-full max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div className="text-3xl font-extrabold tracking-tight text-left">
          📝 Idea Archive
          </div>
          <button
            type="button"
            onClick={() => router.push('/archive')}
            className="text-lg text-gray-600 hover:text-gray-900 transition-colors"
          >
            View Archive
          </button>
        </div>

        <div className="flex justify-center">
          <form
            ref={previewRef as React.RefObject<HTMLFormElement>}
            onSubmit={handleSubmit}
            className="bg-white mb-8 border border-gray-400 rounded-lg p-6 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.1),-4px_0_8px_-4px_rgba(0,0,0,0.1)] max-w-2xl w-full"
          >
          <div className="space-y-3">
            {/* 문서 제목 */}
          <div className="mb-4">
            <input
                className="w-full text-2xl font-bold mb-2 px-3 py-2 border border-gray-200 rounded focus:outline-none focus:border-gray-900 focus:ring-0 bg-white placeholder:text-gray-400 transition-colors"
                placeholder="아이디어를 기록해보세요"
                value={formData.documentTitle}
                onChange={(e) => handleInputChange('documentTitle', e.target.value)}
              />
              <div className="flex gap-4 text-xs text-gray-400 mt-1">
                {formData.createdAt && (
                  <span>최초등록일: {new Date(formData.createdAt).toLocaleString('ko-KR')}</span>
                )}
                {formData.updatedAt && (
                  <span>최근 수정일: {new Date(formData.updatedAt).toLocaleString('ko-KR')}</span>
                )}
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

          <div className="mt-6 pt-4 border-t border-gray-200 flex justify-between items-center">
            {editingId && (
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="text-gray-600 hover:text-gray-900 transition-colors text-sm"
              >
                취소
              </button>
            )}
          <button
            type="submit"
              className="bg-black text-white px-4 py-1.5 rounded hover:bg-gray-900 transition font-medium text-sm ml-auto"
            disabled={loading}
          >
              {editingId ? '수정' : 'Add'}
          </button>
          </div>
        </form>
        </div>

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
      </div>

      {/* 로그인 모달 */}
      {showLoginModal && (
        <LoginModal
          onSuccess={handleLoginSuccess}
          onClose={() => setShowLoginModal(false)}
        />
      )}
    </main>
  );
}
