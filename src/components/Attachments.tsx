'use client'

import { useState, useEffect, useRef } from 'react'
import { Paperclip, Upload, Trash2, Download, FileText, FileImage, File, Loader2, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { uploadFile, getFileUrl, deleteFile, formatFileSize, getFileIcon, ALLOWED_MIME_TYPES, MAX_FILE_SIZE } from '@/lib/storage'
import { useAuth } from '@/contexts/auth'
import { getInitials } from '@/lib/utils'

type Attachment = {
  id: string
  file_name: string
  file_path: string
  file_size: number | null
  mime_type: string | null
  uploaded_by: string | null
  created_at: string
  uploader?: { full_name: string } | null
}

type Props = {
  taskId?: string
  opportunityId?: string
}

function FileIcon({ mime }: { mime: string | null }) {
  const type = getFileIcon(mime ?? '')
  if (type === 'pdf') return <FileText size={18} className="text-red-500" />
  if (type === 'image') return <FileImage size={18} className="text-blue-500" />
  if (type === 'excel') return <FileText size={18} className="text-emerald-500" />
  if (type === 'word') return <FileText size={18} className="text-blue-600" />
  return <File size={18} className="text-gray-400" />
}

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60) return 'vừa xong'
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`
  return `${Math.floor(diff / 86400)} ngày trước`
}

export default function Attachments({ taskId, opportunityId }: Props) {
  const { user } = useAuth()
  const supabase = createClient()
  const inputRef = useRef<HTMLInputElement>(null)
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isManager = ['boss', 'admin', 'sale_admin'].includes(user?.role ?? '')

  useEffect(() => { loadAttachments() }, [taskId, opportunityId])

  async function loadAttachments() {
    setLoading(true)
    const query = supabase
      .from('attachments')
      .select('*, uploader:users!uploaded_by(full_name)')
      .order('created_at', { ascending: false })

    if (taskId) query.eq('task_id', taskId)
    else if (opportunityId) query.eq('opportunity_id', opportunityId)

    const { data } = await query
    setAttachments((data ?? []) as unknown as Attachment[])
    setLoading(false)
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    setError(null)

    for (const file of Array.from(files)) {
      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        setError(`Loại file không được hỗ trợ: ${file.name}`)
        continue
      }
      if (file.size > MAX_FILE_SIZE) {
        setError(`File quá lớn (tối đa 10MB): ${file.name}`)
        continue
      }

      setUploading(true)
      try {
        const ext = file.name.split('.').pop()
        const folder = taskId ? `task-files/${taskId}` : `order-files/${opportunityId}`
        const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

        await uploadFile(path, file)
        const { data } = await supabase.from('attachments').insert({
          task_id: taskId ?? null,
          opportunity_id: opportunityId ?? null,
          file_name: file.name,
          file_path: path,
          file_size: file.size,
          mime_type: file.type,
          uploaded_by: user?.id,
        }).select('*, uploader:users!uploaded_by(full_name)').single()

        if (data) setAttachments(prev => [data as unknown as Attachment, ...prev])
      } catch {
        setError(`Lỗi upload: ${file.name}`)
      }
      setUploading(false)
    }
  }

  async function handleDelete(att: Attachment) {
    if (!confirm(`Xóa file "${att.file_name}"?`)) return
    await deleteFile(att.file_path)
    await supabase.from('attachments').delete().eq('id', att.id)
    setAttachments(prev => prev.filter(a => a.id !== att.id))
  }

  async function handleDownload(att: Attachment) {
    const url = await getFileUrl(att.file_path)
    window.open(url, '_blank')
  }

  const canDelete = (att: Attachment) => isManager || att.uploaded_by === user?.id

  return (
    <div className="space-y-4">
      {/* Upload area */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files) }}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
          dragOver ? 'border-brand-400 bg-brand-50' : 'border-gray-200 hover:border-brand-300 hover:bg-gray-50'
        }`}
      >
        <input ref={inputRef} type="file" multiple className="hidden"
          accept={ALLOWED_MIME_TYPES.join(',')}
          onChange={e => handleFiles(e.target.files)} />
        {uploading ? (
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
            <Loader2 size={16} className="animate-spin" /> Đang upload...
          </div>
        ) : (
          <>
            <Upload size={20} className="text-gray-300 mx-auto mb-2" />
            <p className="text-xs text-gray-500">Kéo thả file vào đây hoặc <span className="text-brand-600 font-medium">chọn file</span></p>
            <p className="text-[10px] text-gray-400 mt-1">PDF, Word, Excel, ảnh · Tối đa 10MB/file</p>
          </>
        )}
      </div>

      {error && (
        <div className="flex items-center justify-between bg-red-50 text-red-600 text-xs px-3 py-2 rounded-lg">
          <span>{error}</span>
          <button onClick={() => setError(null)}><X size={12} /></button>
        </div>
      )}

      {/* File list */}
      {loading ? (
        <div className="flex justify-center py-6"><Loader2 size={20} className="animate-spin text-gray-300" /></div>
      ) : attachments.length === 0 ? (
        <div className="text-center py-6">
          <Paperclip size={24} className="text-gray-200 mx-auto mb-2" />
          <p className="text-xs text-gray-400">Chưa có file đính kèm</p>
        </div>
      ) : (
        <div className="space-y-2">
          {attachments.map(att => (
            <div key={att.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors group">
              <FileIcon mime={att.mime_type} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-800 truncate">{att.file_name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  {att.file_size && <span className="text-[10px] text-gray-400">{formatFileSize(att.file_size)}</span>}
                  {att.uploader && (
                    <span className="text-[10px] text-gray-400">
                      · {att.uploader.full_name}
                    </span>
                  )}
                  <span className="text-[10px] text-gray-400">· {timeAgo(att.created_at)}</span>
                </div>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => handleDownload(att)}
                  className="p-1.5 rounded-lg hover:bg-white text-gray-500 hover:text-brand-600 transition-colors">
                  <Download size={13} />
                </button>
                {canDelete(att) && (
                  <button onClick={() => handleDelete(att)}
                    className="p-1.5 rounded-lg hover:bg-white text-gray-500 hover:text-red-500 transition-colors">
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
