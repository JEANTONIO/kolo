const CATS=[
  ['produits','📦','Produits','Acheter & vendre'],
  ['telephones','📱','Téléphones','Smartphones & accessoires'],
  ['informatique','💻','Informatique','PC & services'],
  ['vehicules','🏍️','Véhicules','Autos & motos'],
  ['immobilier','🏠','Immobilier','Maisons & terrains'],
  ['services','🛠️','Services','Professionnels'],
  ['emploi','💼','Emploi','Jobs & missions'],
  ['mode','👟','Mode','Vêtements & chaussures']
];
const cities=['Brazzaville','Pointe-Noire','Dolisie','Nkayi','Ouesso'];

const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const money=n=>new Intl.NumberFormat('fr-FR').format(Number(n)||0)+' FCFA';
const AUTH_REDIRECT_URL='https://kolomarket.netlify.app/index.html';
const state={items:[],q:'',city:'',cat:'',sort:'newest',user:null};

if(!window.KOLO_CONFIG?.SUPABASE_URL || !window.KOLO_CONFIG?.SUPABASE_ANON_KEY){
  document.body.innerHTML='<main style="max-width:720px;margin:80px auto;padding:24px;font-family:system-ui"><h1>Configuration KÔLÔ manquante</h1><p>Renseigne SUPABASE_URL et SUPABASE_ANON_KEY dans <code>js/config.js</code>, puis recharge la page.</p></main>';
  throw new Error('KOLO_CONFIG is missing');
}
if(!window.supabase?.createClient){
  document.body.innerHTML='<main style="max-width:720px;margin:80px auto;padding:24px;font-family:system-ui"><h1>Supabase indisponible</h1><p>La bibliothèque Supabase n’a pas pu être chargée. Vérifie ta connexion Internet et recharge la page.</p></main>';
  throw new Error('Supabase JS client is missing');
}

const sb=window.supabase.createClient(KOLO_CONFIG.SUPABASE_URL,KOLO_CONFIG.SUPABASE_ANON_KEY);

function modal(html){$('#modalBody').innerHTML=html;$('#modal').classList.remove('hidden')}
function close(){ $('#modal').classList.add('hidden') }
function showError(message){alert(message||'Une erreur est survenue.');}

function categories(){
  $('#categoriesGrid').innerHTML=CATS.map(c=>`<button type="button" class="category${state.cat===c[0]?' active':''}" data-cat="${c[0]}"><div class="icon">${c[1]}</div><h3>${c[2]}</h3><p>${c[3]}</p></button>`).join('');
  document.querySelectorAll('[data-cat]').forEach(b=>b.onclick=()=>{
    state.cat=state.cat===b.dataset.cat?'':b.dataset.cat;
    categories();
    render();
    location.hash='annonces';
  });
}

async function load(){
  const {data,error}=await sb.from('listings').select('*').eq('status','active').order('created_at',{ascending:false});
  if(error){
    console.error('Erreur chargement annonces:',error);
    state.items=[];
    $('#count').textContent='0';
    $('#empty').classList.remove('hidden');
    showError('Impossible de charger les annonces. Vérifie la configuration Supabase et les politiques RLS.');
    return;
  }
  state.items=data||[];
  render();
}

function filtered(){
  let a=state.items.filter(x=>{
    const t=[x.title,x.description,x.seller_name,x.neighborhood,x.city].filter(Boolean).join(' ').toLowerCase();
    return (!state.q||t.includes(state.q.toLowerCase())) && (!state.city||x.city===state.city) && (!state.cat||x.category===state.cat);
  });
  if(state.sort==='price-low')a.sort((x,y)=>Number(x.price)-Number(y.price));
  if(state.sort==='price-high')a.sort((x,y)=>Number(y.price)-Number(x.price));
  return a;
}

function render(){
  const a=filtered();
  $('#count').textContent=state.items.length;
  $('#listings').innerHTML=a.map(x=>`<article class="card"><div class="photo">${x.image_url?`<img src="${esc(x.image_url)}" alt="${esc(x.title)}" loading="lazy" referrerpolicy="no-referrer">`:`<div class="placeholder">${esc(x.emoji||'📦')}</div>`}</div><div class="body"><h3 class="title">${esc(x.title)}</h3><div class="price">${money(x.price)}</div><div class="meta">📍 ${esc(x.neighborhood)}, ${esc(x.city)}</div><div class="meta">👤 ${esc(x.seller_name)}</div><div class="actions"><button type="button" class="btn primary" data-view="${x.id}">Voir</button><button type="button" class="fav" data-fav="${x.id}" aria-label="Ajouter aux favoris">♡</button></div></div></article>`).join('');
  $('#empty').classList.toggle('hidden',a.length>0);
  document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>view(Number(b.dataset.view)));
  document.querySelectorAll('[data-fav]').forEach(b=>b.onclick=()=>favorite(Number(b.dataset.fav)));
}

function view(id){
  const x=state.items.find(i=>Number(i.id)===Number(id));
  if(!x)return;
  modal(`<span class="eyebrow">Annonce</span><h2>${esc(x.title)}</h2><p class="price">${money(x.price)}</p>${x.image_url?`<img style="width:100%;border-radius:14px;max-height:330px;object-fit:cover" src="${esc(x.image_url)}" alt="${esc(x.title)}" loading="lazy">`:''}<p>${esc(x.description)}</p><p>📍 ${esc(x.neighborhood)}, ${esc(x.city)}</p><p>👤 ${esc(x.seller_name)}</p><button type="button" class="btn primary" id="contactSeller">Contacter le vendeur</button>`);
  $('#contactSeller').onclick=()=>contact(x.id);
}

async function favorite(id){
  if(!state.user)return login('Connecte-toi pour enregistrer des favoris.');
  const {error}=await sb.from('favorites').upsert({user_id:state.user.id,listing_id:id},{onConflict:'user_id,listing_id'});
  if(error)showError(error.message);else alert('Annonce ajoutée aux favoris.');
}

function contact(id){
  const x=state.items.find(i=>Number(i.id)===Number(id));
  if(!x)return;
  if(String(x.owner_id)===String(state.user?.id||''))return showError('Tu ne peux pas te contacter toi-même.');

  const phone=String(x.seller_phone||'').trim();
  if(!phone){
    return showError('Le numéro du vendeur n’est pas disponible pour cette annonce.');
  }

  // Le schéma tel: demande au système d’ouvrir l’application
  // appropriée (Téléphone, FaceTime, Skype, etc. selon l’appareil).
  const normalized=phone.replace(/[^0-9+]/g,'');
  if(!normalized)return showError('Le numéro du vendeur est invalide.');
  window.location.href=`tel:${normalized}`;
}

function login(message=''){
  modal(`<span class="eyebrow">Compte KÔLÔ</span><h2>Se connecter</h2>${message?`<div class="notice">${esc(message)}</div>`:''}<form id="login" class="form"><label>Email<input name="email" type="email" autocomplete="email" required></label><label>Mot de passe<input name="password" type="password" autocomplete="current-password" minlength="6" required></label><button type="submit" class="btn primary">Se connecter</button></form>`);
  $('#login').onsubmit=async e=>{
    e.preventDefault();
    const f=new FormData(e.target);
    const {error}=await sb.auth.signInWithPassword({email:f.get('email'),password:f.get('password')});
    if(error)showError(error.message);else{close();await refreshAuth();}
  };
}

function signup(message=''){
  modal(`<span class="eyebrow">Rejoindre KÔLÔ</span><h2>Créer un compte</h2>${message?`<div class="notice">${esc(message)}</div>`:''}<form id="signup" class="form"><label>Nom complet<input name="name" autocomplete="name" required></label><label>Téléphone<input name="phone" autocomplete="tel"></label><label>Email<input name="email" type="email" autocomplete="email" required></label><label>Mot de passe<input name="password" type="password" autocomplete="new-password" minlength="6" required></label><label class="privacy-check"><input name="privacy" type="checkbox" required> <span>J'accepte la <a href="confidentialite.html" target="_blank" rel="noopener">Politique de confidentialité</a>.</span></label><button type="submit" class="btn primary">Créer mon compte</button></form>`);
  $('#signup').onsubmit=async e=>{
    e.preventDefault();
    const f=new FormData(e.target);
    if(!f.get('privacy'))return showError('Tu dois accepter la Politique de confidentialité pour créer un compte.');
    const {data,error}=await sb.auth.signUp({email:f.get('email'),password:f.get('password'),options:{data:{full_name:f.get('name'),phone:f.get('phone')},emailRedirectTo:AUTH_REDIRECT_URL}});
    if(error)return showError(error.message);
    if(data.session){close();await refreshAuth();alert('Compte créé avec succès.');}
    else{close();alert('Compte créé. Vérifie ton email si la confirmation est activée dans Supabase.');}
  };
}

function publish(){
  if(!state.user)return login('Connecte-toi pour publier une annonce.');
  modal(`<span class="eyebrow">Vendre sur KÔLÔ</span><h2>Nouvelle annonce</h2><form id="publish" class="form"><label>Titre<input name="title" maxlength="100" required></label><div class="row"><label>Prix (FCFA)<input name="price" type="number" min="0" step="1" required></label><label>Catégorie<select name="category" required>${CATS.map(c=>`<option value="${c[0]}">${c[2]}</option>`).join('')}</select></label></div><div class="row"><label>Ville<select name="city" required>${cities.map(c=>`<option value="${c}">${c}</option>`).join('')}</select></label><label>Quartier<input name="neighborhood" maxlength="100" required></label></div><label>Photo<input name="photo" type="file" accept="image/jpeg,image/png,image/webp,image/gif"></label><label>Description<textarea name="description" maxlength="2000"></textarea></label><button type="submit" class="btn primary">Publier l'annonce</button></form>`);
  $('#publish').onsubmit=async e=>{
    e.preventDefault();
    const f=new FormData(e.target);
    const title=String(f.get('title')||'').trim();
    const neighborhood=String(f.get('neighborhood')||'').trim();
    const description=String(f.get('description')||'').trim();
    const price=Number(f.get('price'));
    if(title.length<3)return showError('Le titre doit contenir au moins 3 caractères.');
    if(!Number.isFinite(price)||price<0)return showError('Le prix est invalide.');
    if(!neighborhood)return showError('Le quartier est obligatoire.');

    let image_url=null;
    const file=f.get('photo');
    if(file&&file.size){
      if(file.size>5*1024*1024)return showError('Image trop lourde (5 Mo maximum).');
      const allowed=['image/jpeg','image/png','image/webp','image/gif'];
      if(!allowed.includes(file.type))return showError('Format d’image non pris en charge.');
      const ext=({ 'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/gif':'gif' })[file.type];
      const path=`${state.user.id}/${crypto.randomUUID()}.${ext}`;
      const up=await sb.storage.from('listing-images').upload(path,file,{upsert:false,contentType:file.type});
      if(up.error)return showError(up.error.message);
      image_url=sb.storage.from('listing-images').getPublicUrl(path).data.publicUrl;
    }

    const {data:p,error:profileError}=await sb.from('profiles').select('full_name,phone').eq('id',state.user.id).maybeSingle();
    if(profileError)return showError(profileError.message);
    const {error}=await sb.from('listings').insert({owner_id:state.user.id,title,price,category:f.get('category'),city:f.get('city'),neighborhood,description,seller_name:p?.full_name||'Utilisateur KÔLÔ',seller_phone:p?.phone||'',image_url});
    if(error)return showError(error.message);
    close();
    await load();
    alert('Annonce publiée avec succès.');
  };
}

async function dashboard(){
  if(!state.user)return login();
  const [{data:p,error:profileError},{data:mine,error:mineError},{data:favs,error:favError}]=await Promise.all([
    sb.from('profiles').select('*').eq('id',state.user.id).maybeSingle(),
    sb.from('listings').select('*').eq('owner_id',state.user.id).order('created_at',{ascending:false}),
    sb.from('favorites').select('listing_id').eq('user_id',state.user.id)
  ]);
  if(profileError||mineError||favError)return showError((profileError||mineError||favError).message);

  modal(`<span class="eyebrow">Mon espace</span><h2>${esc(p?.full_name||'Mon compte')}</h2><div class="profile-nav"><button type="button" class="btn outline" id="logout">Déconnexion</button></div><h3>Mon profil</h3><form id="profile" class="form"><label>Nom complet<input name="name" value="${esc(p?.full_name||'')}" maxlength="100" required></label><label>Téléphone<input name="phone" value="${esc(p?.phone||'')}" maxlength="30"></label><label>Ville<input name="city" value="${esc(p?.city||'')}" maxlength="80"></label><button type="submit" class="btn primary">Enregistrer</button></form><h3>Mes annonces (${mine?.length||0})</h3>${(mine||[]).map(x=>`<div class="list-row"><span><b>${esc(x.title)}</b><br><small>${money(x.price)}</small></span><button type="button" class="btn outline" data-delete="${x.id}">Supprimer</button></div>`).join('')||'<p class="meta">Aucune annonce.</p>'}<p class="meta">Favoris enregistrés : ${favs?.length||0}</p>`);

  $('#logout').onclick=async()=>{const {error}=await sb.auth.signOut();if(error)showError(error.message);else{close();await refreshAuth();}};
  $('#profile').onsubmit=async e=>{
    e.preventDefault();
    const f=new FormData(e.target);
    const {error}=await sb.from('profiles').update({full_name:String(f.get('name')||'').trim(),phone:String(f.get('phone')||'').trim(),city:String(f.get('city')||'').trim()}).eq('id',state.user.id);
    if(error)showError(error.message);else alert('Profil mis à jour.');
  };
  document.querySelectorAll('[data-delete]').forEach(b=>b.onclick=()=>deleteListing(Number(b.dataset.delete)));
}

async function deleteListing(id){
  if(!confirm('Supprimer cette annonce ?'))return;
  const {error}=await sb.from('listings').update({status:'deleted'}).eq('id',id).eq('owner_id',state.user.id);
  if(error)showError(error.message);else{close();await load();await dashboard();}
}

function updateAuthUI(){
  const loggedIn=!!state.user;
  $('#loginBtn').classList.toggle('hidden', loggedIn);
  $('#signupBtn').classList.toggle('hidden', loggedIn);
  $('#dashboardBtn').classList.toggle('hidden', !loggedIn);
  $('#publishBtn').classList.toggle('hidden', !loggedIn);
}

async function refreshAuth(){
  const {data,error}=await sb.auth.getSession();
  if(error){console.error(error);return;}
  state.user=data.session?.user||null;
  updateAuthUI();
  if(state.user?.email_confirmed_at){
    const {error:verifyError}=await sb.from('profiles').update({is_verified:true}).eq('id',state.user.id);
    if(verifyError) console.warn('Impossible de synchroniser la vérification du profil:',verifyError.message);
  }
}

$('#searchForm').onsubmit=e=>{e.preventDefault();state.q=$('#q').value.trim();state.city=$('#city').value;render();location.hash='annonces'};
$('#sort').onchange=e=>{state.sort=e.target.value;render()};
document.querySelectorAll('[data-q]').forEach(b=>b.onclick=()=>{$('#q').value=b.dataset.q;state.q=b.dataset.q;render();location.hash='annonces'});
$('#loginBtn').onclick=()=>login();
$('#signupBtn').onclick=signup;
$('#dashboardBtn').onclick=dashboard;
$('#publishBtn').onclick=publish;
$('#close').onclick=close;
$('#modal').onclick=e=>{if(e.target.id==='modal')close()};
$('#menuBtn').onclick=()=>$('#nav').classList.toggle('mobile');
document.querySelectorAll('#nav a').forEach(a=>a.onclick=()=>$('#nav').classList.remove('mobile'));

(async()=>{
  categories();
  const hash=new URLSearchParams(location.hash.replace(/^#/,' '));
  const search=new URLSearchParams(location.search);
  const authError=hash.get('error_description')||search.get('error_description');
  if(authError){
    console.error('Erreur de validation e-mail:',authError);
    history.replaceState({},document.title,location.pathname);
    showError('La validation de ton compte a échoué. Le lien peut être expiré.');
  }
  await refreshAuth();
  await load();
  sb.auth.onAuthStateChange(async(_event,session)=>{
    state.user=session?.user||null;
    updateAuthUI();
    if(session?.user?.email_confirmed_at){
      const {error}=await sb.from('profiles').update({is_verified:true}).eq('id',session.user.id);
      if(error) console.warn('Synchronisation vérification:',error.message);
    }
  });
})();
