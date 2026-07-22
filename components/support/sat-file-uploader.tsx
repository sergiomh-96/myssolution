'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { 
  Upload, 
  Trash2, 
  Eye, 
  Download, 
  FileText, 
  FileCode, 
  FileImage, 
  FileVideo, 
  File, 
  Loader2, 
  ExternalLink,
  Film,
  Paperclip
} from 'lucide-react'
import { toast } from 'sonner'
import type { SatAttachment } from '@/lib/types/database'
import { cn } from '@/lib/utils'

interface SatFileUploaderProps {
  bucketName: 'sat_facturas' | 'sat_images'
  title: string
  description: string
  acceptTypes: string
  files: SatAttachment[]
  onChange: (files: SatAttachment[]) => void
  disabled?: boolean
  assistanceId?: string | number
}

function formatFileSize(bytes?: number): string {
  if (!bytes || bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

function getFileTypeCategory(file: SatAttachment): 'image' | 'video' | 'pdf' | 'word' | 'other' {
  const type = (file.type || '').toLowerCase()
  const name = (file.name || '').toLowerCase()

  if (type.includes('image') || /\.(jpg|jpeg|png|webp|gif|svg|bmp)$/i.test(name)) {
    return 'image'
  }
  if (type.includes('video') || /\.(mp4|webm|mov|avi|mkv|wmv)$/i.test(name)) {
    return 'video'
  }
  if (type.includes('pdf') || /\.pdf$/i.test(name)) {
    return 'pdf'
  }
  if (type.includes('word') || type.includes('officedocument') || /\.(doc|docx)$/i.test(name)) {
    return 'word'
  }
  return 'other'
}

export function SatFileUploader({
  bucketName,
  title,
  description,
  acceptTypes,
  files = [],
  onChange,
  disabled = false,
  assistanceId
}: SatFileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<string>('')
  const [previewFile, setPreviewFile] = useState<SatAttachment | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (disabled) return
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    if (disabled) return

    const droppedFiles = Array.from(e.dataTransfer.files)
    if (droppedFiles.length > 0) {
      await processAndUploadFiles(droppedFiles)
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files)
      await processAndUploadFiles(selectedFiles)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const processAndUploadFiles = async (fileList: File[]) => {
    setUploading(true)
    const supabase = createClient()
    const uploadedAttachments: SatAttachment[] = []

    try {
      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i]
        setUploadProgress(`Subiendo (${i + 1}/${fileList.length}): ${file.name}`)

        // Sanitize file name
        const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
        const folder = assistanceId ? `incidencia_${assistanceId}` : 'temp'
        const filePath = `${folder}/${Date.now()}_${cleanName}`

        const { data, error } = await supabase.storage
          .from(bucketName)
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: true
          })

        if (error) {
          console.error(`Error uploading ${file.name} to ${bucketName}:`, error)
          toast.error(`Error al subir ${file.name}: ${error.message}`)
          continue
        }

        const { data: publicUrlData } = supabase.storage
          .from(bucketName)
          .getPublicUrl(data.path)

        uploadedAttachments.push({
          name: file.name,
          url: publicUrlData.publicUrl,
          path: data.path,
          type: file.type || 'application/octet-stream',
          size: file.size,
          created_at: new Date().toISOString()
        })
      }

      if (uploadedAttachments.length > 0) {
        onChange([...files, ...uploadedAttachments])
        toast.success(
          uploadedAttachments.length === 1
            ? 'Archivo subido correctamente'
            : `${uploadedAttachments.length} archivos subidos correctamente`
        )
      }
    } catch (err: any) {
      console.error('Error during upload process:', err)
      toast.error('Error al subir los archivos: ' + err.message)
    } finally {
      setUploading(false)
      setUploadProgress('')
    }
  }

  const handleDeleteFile = async (index: number) => {
    const fileToDelete = files[index]
    const updatedFiles = files.filter((_, i) => i !== index)
    onChange(updatedFiles)

    // Attempt to delete from Supabase storage if path exists
    if (fileToDelete.path) {
      try {
        const supabase = createClient()
        await supabase.storage.from(bucketName).remove([fileToDelete.path])
      } catch (err) {
        console.warn('Could not delete file from storage:', err)
      }
    }

    toast.success('Archivo eliminado')
  }

  const renderFileIcon = (file: SatAttachment) => {
    const category = getFileTypeCategory(file)
    switch (category) {
      case 'image':
        return <FileImage className="w-5 h-5 text-blue-500 shrink-0" />
      case 'video':
        return <FileVideo className="w-5 h-5 text-purple-500 shrink-0" />
      case 'pdf':
        return <FileText className="w-5 h-5 text-red-500 shrink-0" />
      case 'word':
        return <FileCode className="w-5 h-5 text-indigo-500 shrink-0" />
      default:
        return <File className="w-5 h-5 text-gray-500 shrink-0" />
    }
  }

  const renderThumbnailOrPreview = (file: SatAttachment) => {
    const category = getFileTypeCategory(file)
    if (category === 'image' && file.url) {
      return (
        <div className="w-10 h-10 rounded overflow-hidden bg-muted flex items-center justify-center shrink-0 border">
          <img 
            src={file.url} 
            alt={file.name} 
            className="w-full h-full object-cover" 
            loading="lazy"
          />
        </div>
      )
    }

    if (category === 'video') {
      return (
        <div className="w-10 h-10 rounded bg-purple-100 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 flex items-center justify-center shrink-0">
          <Film className="w-5 h-5 text-purple-600 dark:text-purple-400" />
        </div>
      )
    }

    return (
      <div className="w-10 h-10 rounded bg-muted/60 border flex items-center justify-center shrink-0">
        {renderFileIcon(file)}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
            <Paperclip className="w-3.5 h-3.5 text-primary" />
            {title}
          </h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">{description}</p>
        </div>
        <Badge variant="outline" className="text-[10px] font-mono">
          {files.length} {files.length === 1 ? 'archivo' : 'archivos'}
        </Badge>
      </div>

      {/* Drag & drop upload box */}
      {!disabled && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            "border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-all duration-200",
            isDragging 
              ? "border-primary bg-primary/10 scale-[0.99]" 
              : "border-border hover:border-primary/50 bg-background hover:bg-muted/20",
            uploading && "pointer-events-none opacity-60"
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={acceptTypes}
            onChange={handleFileSelect}
            className="hidden"
            disabled={disabled || uploading}
          />

          <div className="flex flex-col items-center justify-center gap-2">
            {uploading ? (
              <div className="flex items-center gap-2 text-primary font-medium text-xs">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>{uploadProgress || 'Subiendo archivos...'}</span>
              </div>
            ) : (
              <>
                <div className="p-2 rounded-full bg-primary/10 text-primary">
                  <Upload className="w-5 h-5" />
                </div>
                <div className="text-xs">
                  <span className="font-semibold text-primary hover:underline">Haz clic para subir</span>
                  <span className="text-muted-foreground"> o arrastra y suelta tus archivos aquí</span>
                </div>
                <p className="text-[10px] text-muted-foreground font-mono">
                  Tipos aceptados: {acceptTypes.replace(/\./g, ' ').toUpperCase()}
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {/* File list */}
      {files.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
          {files.map((file, idx) => {
            const category = getFileTypeCategory(file)
            return (
              <Card key={idx} className="shadow-none border hover:border-primary/40 transition-colors group overflow-hidden">
                <CardContent className="p-2.5 flex items-center justify-between gap-2">
                  <div 
                    className="flex items-center gap-2.5 min-w-0 cursor-pointer flex-1"
                    onClick={() => setPreviewFile(file)}
                  >
                    {renderThumbnailOrPreview(file)}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium truncate text-foreground group-hover:text-primary transition-colors" title={file.name}>
                        {file.name}
                      </p>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        <span>{formatFileSize(file.size)}</span>
                        <Badge variant="secondary" className="px-1 py-0 text-[9px] h-4 font-mono uppercase">
                          {category}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-primary"
                      onClick={() => setPreviewFile(file)}
                      title="Ver / Previsualizar"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </Button>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-primary"
                      onClick={() => window.open(file.url, '_blank')}
                      title="Descargar / Abrir en pestaña"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </Button>

                    {!disabled && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDeleteFile(idx)}
                        title="Eliminar archivo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Preview Modal Lightbox */}
      <Dialog open={!!previewFile} onOpenChange={(open) => !open && setPreviewFile(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-4">
          <DialogHeader className="pb-2 border-b">
            <DialogTitle className="text-sm font-bold flex items-center justify-between gap-4 pr-6">
              <span className="truncate">{previewFile?.name}</span>
              {previewFile && (
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={() => window.open(previewFile.url, '_blank')}
                  >
                    <ExternalLink className="w-3 h-3" />
                    Abrir original
                  </Button>
                </div>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-auto flex items-center justify-center py-4 bg-muted/20 rounded-md min-h-[300px]">
            {previewFile && (() => {
              const category = getFileTypeCategory(previewFile)
              if (category === 'image') {
                return (
                  <img
                    src={previewFile.url}
                    alt={previewFile.name}
                    className="max-h-[70vh] max-w-full object-contain rounded shadow-sm"
                  />
                )
              }
              if (category === 'video') {
                return (
                  <video
                    src={previewFile.url}
                    controls
                    autoPlay
                    className="max-h-[70vh] w-full max-w-3xl rounded shadow-sm"
                  />
                )
              }
              if (category === 'pdf') {
                return (
                  <iframe
                    src={previewFile.url}
                    className="w-full h-[70vh] rounded border"
                    title={previewFile.name}
                  />
                )
              }
              return (
                <div className="flex flex-col items-center justify-center p-8 text-center space-y-3">
                  {renderFileIcon(previewFile)}
                  <div>
                    <p className="text-sm font-semibold">{previewFile.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatFileSize(previewFile.size)} • Documento {category.toUpperCase()}
                    </p>
                  </div>
                  <Button
                    type="button"
                    onClick={() => window.open(previewFile.url, '_blank')}
                    className="gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Descargar o ver archivo
                  </Button>
                </div>
              )
            })()}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
