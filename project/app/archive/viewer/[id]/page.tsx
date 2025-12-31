'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Draggable from 'react-draggable';

interface Idea {
  id: string;
  title: string;
  body: string;
  created_at: string;
}

interface IdeaBlock {
  id: string;
  ideaId: string;
  x: number;
  y: number;
  title: string;
  summary: string;
}

export default function IdeaViewerPage() {
  const params = useParams();
  const router = useRouter();
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [ideaBlocks, setIdeaBlocks] = useState<IdeaBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [draggedIdea, setDraggedIdea] = useState<Idea | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchIdeas() {
      const { data, error } = await supabase
        .from('ideas')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (!error && data) {
        setIdeas(data);
      }
      setLoading(false);
    }
    
    fetchIdeas();
  }, []);

  function getIdeaSummary(idea: Idea): string {
    try {
      const parsed = JSON.parse(idea.body);
      const parts = [];
      if (parsed.concept) parts.push(`Concept: ${parsed.concept}`);
      if (parsed.problem) parts.push(parsed.problem.substring(0, 100));
      if (parsed.coreFeatures) parts.push(parsed.coreFeatures.substring(0, 100));
      return parts.join(' | ') || idea.title || 'No summary';
    } catch {
      return idea.title || 'No summary';
    }
  }

  function handleDragStart(e: React.DragEvent, idea: Idea) {
    setDraggedIdea(idea);
    e.dataTransfer.effectAllowed = 'move';
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    if (!draggedIdea || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const newBlock: IdeaBlock = {
      id: `block-${Date.now()}`,
      ideaId: draggedIdea.id,
      x: x - 150, // 블록 너비의 절반을 빼서 중앙 정렬
      y: y - 100, // 블록 높이의 절반을 빼서 중앙 정렬
      title: draggedIdea.title || '제목 없음',
      summary: getIdeaSummary(draggedIdea),
    };

    setIdeaBlocks([...ideaBlocks, newBlock]);
    setDraggedIdea(null);
  }

  function handleBlockDrag(blockId: string, data: { x: number; y: number }) {
    setIdeaBlocks(blocks =>
      blocks.map(block =>
        block.id === blockId ? { ...block, x: data.x, y: data.y } : block
      )
    );
  }

  function handleDeleteBlock(blockId: string) {
    setIdeaBlocks(blocks => blocks.filter(block => block.id !== blockId));
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-white text-gray-900 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white text-gray-900 flex flex-col">
      {/* 상단 헤더 - 모눈 영역 밖 */}
      <div className="flex justify-between items-center px-8 py-4 border-b border-gray-200 bg-white z-10">
        <div className="text-3xl font-extrabold tracking-tight text-left">
          📝 Idea Archive
        </div>
        <button
          onClick={() => router.push('/archive')}
          className="text-gray-600 hover:text-gray-900 transition-colors flex items-center gap-2"
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
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Go To Archive
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* 왼쪽: 아이디어 목록 */}
        <div className="w-64 border-r border-gray-200 bg-gray-50 overflow-y-auto">
          <div className="p-4">
            <h3 className="text-lg font-semibold mb-4">아이디어 목록</h3>
            <div className="space-y-2">
              {ideas.map((idea) => {
                const summary = getIdeaSummary(idea);
                return (
                  <div
                    key={idea.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, idea)}
                    className="bg-white border border-gray-200 rounded-lg p-3 cursor-move hover:shadow-md transition-shadow"
                  >
                    <div className="font-semibold text-sm mb-1 line-clamp-1">
                      {idea.title || '제목 없음'}
                    </div>
                    <div className="text-xs text-gray-600 line-clamp-2">
                      {summary}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 중앙: 모눈 배경 화이트보드 영역 */}
        <div className="flex-1 relative overflow-hidden">
          <div
            ref={canvasRef}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className="w-full h-full overflow-auto"
            style={{
              backgroundImage: `
                linear-gradient(to right, #e5e7eb 1px, transparent 1px),
                linear-gradient(to bottom, #e5e7eb 1px, transparent 1px)
              `,
              backgroundSize: '20px 20px',
              backgroundPosition: '0 0',
            }}
          >
            {ideaBlocks.map((block) => (
              <Draggable
                key={block.id}
                position={{ x: block.x, y: block.y }}
                onStop={(e, data) => handleBlockDrag(block.id, data)}
                bounds="parent"
              >
                <div className="absolute cursor-move">
                  <div className="bg-yellow-100 border-2 border-yellow-300 rounded-lg p-4 shadow-lg w-64 min-h-[120px]">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-semibold text-sm flex-1 line-clamp-2">
                        {block.title}
                      </h4>
                      <button
                        onClick={() => handleDeleteBlock(block.id)}
                        className="ml-2 text-gray-400 hover:text-red-500 transition-colors"
                        title="삭제"
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
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </div>
                    <p className="text-xs text-gray-600 line-clamp-4">
                      {block.summary}
                    </p>
                  </div>
                </div>
              </Draggable>
            ))}
          </div>
        </div>

        {/* 오른쪽: 도구 아이콘들 */}
        <div className="w-16 border-l border-gray-200 bg-gray-50 flex flex-col items-center py-4 gap-4">
          {/* 텍스트 입력 아이콘 */}
          <button
            className="w-10 h-10 flex items-center justify-center border border-gray-300 rounded-lg hover:bg-white transition-colors"
            title="텍스트 입력"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 text-gray-600"
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
          </button>

          {/* 펜툴 아이콘 */}
          <button
            className="w-10 h-10 flex items-center justify-center border border-gray-300 rounded-lg hover:bg-white transition-colors"
            title="펜툴"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 text-gray-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
              />
            </svg>
          </button>

          {/* 도형 아이콘 */}
          <button
            className="w-10 h-10 flex items-center justify-center border border-gray-300 rounded-lg hover:bg-white transition-colors"
            title="도형"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 text-gray-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>

          {/* 연결선 아이콘 */}
          <button
            className="w-10 h-10 flex items-center justify-center border border-gray-300 rounded-lg hover:bg-white transition-colors"
            title="연결선"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 text-gray-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 7l5 5m0 0l-5 5m5-5H6"
              />
            </svg>
          </button>
        </div>
      </div>
    </main>
  );
}
