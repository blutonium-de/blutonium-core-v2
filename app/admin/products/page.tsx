'use client'
import { useState } from 'react'
import NavBar from "@/components/NavBar"


type Img = { file?:File; url?:string; alt?:string }
export default function AdminProducts(){
  const [titleDe,setTitleDe]=useState('');const [titleEn,setTitleEn]=useState('')
  const [price,setPrice]=useState(1999);const [images,setImages]=useState<Img[]>([])
  const onFiles = (files:FileList|null)=>{
    if(!files) return
    const arr = Array.from(files).slice(0,10).map(f=>({file:f, url:URL.createObjectURL(f)}))
    setImages(arr)
  }
  const save = async ()=>{
    alert('Demo: Hier würden wir das Produkt über /api/products speichern und Bilder zu S3 hochladen (presigned URLs).')
  }
  return (
    <section className="space-y-6 max-w-3xl">
      <h1 className="text-3xl font-bold">Admin — Produkt anlegen</h1>
      <div className="card p-6 space-y-4">
        <label className="block">Titel (DE)
          <input value={titleDe} onChange={e=>setTitleDe(e.target.value)} className="mt-1 w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2"/>
        </label>
        <label className="block">Title (EN)
          <input value={titleEn} onChange={e=>setTitleEn(e.target.value)} className="mt-1 w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2"/>
        </label>
        <label className="block">Preis (Cent)
          <input type="number" value={price} onChange={e=>setPrice(+e.target.value)} className="mt-1 w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2"/>
        </label>
        <div>
          <div className="mb-2">Bilder (max 10)</div>
          <input type="file" multiple accept="image/*" onChange={e=>onFiles(e.target.files)} />
          <div className="grid grid-cols-5 gap-3 mt-3">
            {images.map((img,i)=>(
              <div key={i} className="aspect-square bg-zinc-800 rounded overflow-hidden">
                {img.url && <img src={img.url} alt="" className="w-full h-full object-cover" />}
              </div>
            ))}
          </div>
        </div>
        <button className="btn" onClick={save}>Speichern (Demo)</button>
      </div>
    </section>
  )
}
