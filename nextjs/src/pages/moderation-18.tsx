import {useEffect,useState} from 'react'
import Link from 'next/link'
import {supabase} from '../lib/supabaseClient'

type Post={id:string;author_id:string;body:string;image_urls:string[];created_at:string;author?:any}
export default function Moderation18Page(){
 const [allowed,setAllowed]=useState(false),[loading,setLoading]=useState(true),[posts,setPosts]=useState<Post[]>([]),[error,setError]=useState(''),[busy,setBusy]=useState('')
 async function load(){
  setLoading(true);setError('')
  const {data:{user}}=await supabase.auth.getUser()
  if(!user){location.href='/auth';return}
  const {data:role,error:roleError}=await supabase.from('user_roles').select('role').eq('user_id',user.id).maybeSingle()
  if(roleError||!role||!['admin','moderator'].includes(role.role)){setAllowed(false);setLoading(false);return}
  setAllowed(true)
  const {data,error}=await supabase.from('individual_posts').select('id,author_id,body,image_urls,created_at').order('created_at',{ascending:false}).limit(100)
  if(error){setError('Impossible de charger les contenus : '+error.message);setLoading(false);return}
  const rows=(data||[]) as Post[],ids=[...new Set(rows.map(p=>p.author_id))]
  const {data:profiles}=ids.length?await supabase.from('profiles').select('id,username,display_name').in('id',ids):{data:[] as any[]}
  setPosts(rows.map(p=>({...p,author:profiles?.find(x=>x.id===p.author_id)})));setLoading(false)
 }
 useEffect(()=>{load()},[])
 async function remove(post:Post){
  if(!window.confirm('Supprimer définitivement ce contenu (texte et images) ?'))return
  setBusy(post.id);setError('')
  const {error:commentsError}=await supabase.from('individual_post_comments').delete().eq('post_id',post.id)
  if(commentsError){setError('Suppression impossible : '+commentsError.message);setBusy('');return}
  const {error:likesError}=await supabase.from('individual_post_likes').delete().eq('post_id',post.id)
  if(likesError){setError('Suppression impossible : '+likesError.message);setBusy('');return}
  const {error:deleteError}=await supabase.from('individual_posts').delete().eq('id',post.id)
  if(deleteError)setError('Suppression impossible : '+deleteError.message)
  else setPosts(current=>current.filter(p=>p.id!==post.id))
  setBusy('')
 }
 return <main style={{maxWidth:900,margin:'0 auto',padding:24,color:'var(--foreground,#222)'}}>
  <header style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,flexWrap:'wrap'}}><div><small>WESHBIEN2 · MODÉRATION</small><h1>Espace 18+ — Modération</h1><p>Gérer les publications de l’espace réservé aux adultes.</p></div><Link href="/feed">Retour au site</Link></header>
  {loading?<p>Chargement…</p>:!allowed?<p>Accès réservé aux modérateurs et administrateurs.</p>:<><p>Les modérateurs peuvent retirer une publication entière, son texte et ses images.</p>{error&&<p role="alert">{error}</p>}{posts.length===0?<p>Aucune publication à modérer.</p>:posts.map(post=><article key={post.id} style={{border:'1px solid #ccc',borderRadius:12,padding:16,margin:'16px 0'}}>
   <p><strong>{post.author?.display_name||post.author?.username||'Membre'}</strong> · {new Date(post.created_at).toLocaleString('fr-FR')}</p>
   {post.body&&<p style={{whiteSpace:'pre-wrap'}}>{post.body}</p>}
   {(post.image_urls||[]).map((url,i)=><img key={i} src={url} alt="Image publiée" style={{maxWidth:'100%',maxHeight:320,objectFit:'contain',margin:'6px 6px 6px 0',borderRadius:8}}/>)}
   <button type="button" disabled={busy===post.id} onClick={()=>remove(post)} style={{background:'#b42318',color:'#fff',border:0,borderRadius:8,padding:'10px 14px',marginTop:10}}>{busy===post.id?'Suppression…':'Supprimer ce contenu'}</button>
  </article>)}</>}
 </main>
}