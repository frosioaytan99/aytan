type MatchProfile = { interests?: string|null; hobbies?: string|null; favorite_music?: string|null; city?: string|null }

const aliases:Record<string,string>={
  foot:"football", soccer:"football", footballeur:"football", football:"football",
  gaming:"jeuxvideo", gamer:"jeuxvideo", jeuxvideo:"jeuxvideo", jeuxvideos:"jeuxvideo",
  cinema:"films", film:"films", series:"films", serie:"films",
  manga:"anime", anime:"anime", animes:"anime",
  fitness:"sport", musculation:"sport", sports:"sport",
  rap:"rap", hiphop:"rap", "hip hop":"rap",
  dessin:"art", peinture:"art", artistique:"art"
}
const ignored=new Set(["les","des","une","un","pour","avec","dans","sur","mon","ma","mes","ton","ta","tes","et","ou","de","du","la","le","the","and","aux","au"])
function normalize(value:string):string{
  const plain=value.toLocaleLowerCase('fr-FR').normalize('NFD').replace(/[\u0300-\u036f]/g,'')
  return plain.replace(/[^a-z0-9]+/g,' ').trim().split(/\s+/).map(word=>{
    if(word.length>4&&word.endsWith('es'))word=word.slice(0,-2)
    else if(word.length>3&&word.endsWith('s'))word=word.slice(0,-1)
    return aliases[word]||word
  }).filter(word=>word.length>2&&!ignored.has(word)).join(' ')
}
function tokens(value?:string|null):Set<string>{return new Set((value||'').split(/[,;|/\n]+/).flatMap(part=>normalize(part).split(' ')).filter(Boolean))}
function editSimilarity(a:string,b:string):number{
  const prev=Array.from({length:b.length+1},(_,i)=>i)
  for(let i=1;i<=a.length;i++){
    let diagonal=prev[0];prev[0]=i
    for(let j=1;j<=b.length;j++){const old=prev[j];prev[j]=Math.min(prev[j]+1,prev[j-1]+1,diagonal+(a[i-1]===b[j-1]?0:1));diagonal=old}
  }
  return 1-prev[b.length]/Math.max(a.length,b.length,1)
}
function overlap(a?:string|null,b?:string|null):number|null{
  if(!a?.trim()||!b?.trim())return null
  const aa=tokens(a),bb=tokens(b)
  if(!aa.size||!bb.size)return null
  let matched=0
  const used=new Set<string>()
  for(const left of aa){
    const right=[...bb].filter(item=>!used.has(item)).sort((x,y)=>editSimilarity(left,y)-editSimilarity(left,x))[0]
    if(right&&(left===right||(Math.min(left.length,right.length)>=5&&editSimilarity(left,right)>=0.82))){matched++;used.add(right)}
  }
  return matched/Math.max(aa.size,bb.size)
}
export function calculateCompatibility(a:MatchProfile,b:MatchProfile):number|null{
  const parts:[number,number|null][]=[
    [35,overlap(a.interests,b.interests)],
    [35,overlap(a.hobbies,b.hobbies)],
    [20,overlap(a.favorite_music,b.favorite_music)]
  ]
  if(a.city?.trim()&&b.city?.trim())parts.push([10,normalize(a.city)===normalize(b.city)?1:0])
  const available=parts.filter((part):part is [number,number]=>part[1]!==null)
  if(!available.length)return null
  const total=available.reduce((sum,part)=>sum+part[0],0)
  const similarity=available.reduce((sum,part)=>sum+part[0]*part[1],0)/total
  // Un score plancher évite d'afficher 0 % dès que les profils sont renseignés mais différents.
  return Math.round(10+similarity*90)
}