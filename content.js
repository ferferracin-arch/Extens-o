(async function () {
  const PANEL_ID = 'amz-panel-511';
  let lastASIN = null;

  function getASIN(){
    return document.getElementById('ASIN')?.value ||
      location.pathname.match(/\/dp\/([A-Z0-9]{10})/)?.[1] ||
      location.pathname.match(/\/gp\/product\/([A-Z0-9]{10})/)?.[1] ||
      null;
  }

  function parsePrice(t){
    if(!t) return null;
    return parseFloat(t.replace('R$','').replace('.','').replace(',','.'));
  }

  function txt(sel){ return document.querySelector(sel)?.innerText?.trim() || '—'; }

  function getRanking(){
    const nodes=[
      ...document.querySelectorAll('#detailBullets_feature_div li'),
      ...document.querySelectorAll('#detailBulletsWrapper_feature_div li'),
      ...document.querySelectorAll('#productDetails_detailBullets_sections1 tr')
    ];
    for(const n of nodes){
      if(/Ranking|Mais vendidos/i.test(n.innerText)){
        const m=n.innerText.match(/#?([0-9\.]+)/);
        if(m) return m[1];
      }
    }
    return '—';
  }

  function getVendors(){
    const el=document.querySelector('[href*="offer-listing"]');
    if(!el) return '1';
    const m=el.innerText.match(/(\d+)/);
    return m?m[1]:'1';
  }

  function getMonthly(){
    const el=[...document.querySelectorAll('span')]
      .find(s=>/compras no mês/i.test(s.innerText));
    if(!el) return '—';
    const m=el.innerText.match(/(\d+)/);
    return m?m[1]:'—';
  }

  async function fetchOfferListing(asin){
    try{
      const html=await fetch(`https://www.amazon.com.br/gp/offer-listing/${asin}`,{credentials:'include'}).then(r=>r.text());
      const doc=new DOMParser().parseFromString(html,'text/html');
      return [...doc.querySelectorAll('.olpOffer')].slice(0,5).map(o=>({
        seller:o.querySelector('.olpSellerName')?.innerText.trim()||'—',
        price:parsePrice(o.querySelector('.olpOfferPrice')?.innerText),
        prime:o.innerText.includes('Prime')
      }));
    }catch(e){ return []; }
  }

  function removePanel(){
    document.getElementById(PANEL_ID)?.remove();
  }

  function render(d){
    removePanel();
    const panel=document.createElement('div');
    panel.id=PANEL_ID;
    panel.style.cssText=`
      position:fixed;top:0;right:0;width:320px;height:100%;
      background:#fff;z-index:999999;border-left:1px solid #ddd;
      font-family:Arial,sans-serif;box-shadow:-2px 0 6px rgba(0,0,0,.15);
      overflow:auto;
    `;

    panel.innerHTML=`
      <div style="padding:10px;border-bottom:1px solid #eee">
        <b>AMZ Analytics</b>
        <span id="closeBtn" style="float:right;cursor:pointer">✕</span>
      </div>

      <div style="padding:10px;font-size:13px">
        <h4>Produto</h4>
        Preço: R$ ${d.price?.toFixed(2)||'—'}<br>
        Avaliação: ${d.rating}<br>
        Reviews: ${d.reviews||'—'}<br>
        Ranking Amazon: ${d.ranking}<br>
        Nº de vendedores: ${d.vendors}<br>
        Volume mensal: ${d.monthly}<br><br>

        <h4>Buy Box & Sellers</h4>
        ${d.offers.length?d.offers.map(o=>`
          ${o.seller} — R$ ${o.price?.toFixed(2)||'—'} ${o.prime?'(Prime)':''}
        `).join('<br>'):'—'}
      </div>
    `;

    document.body.appendChild(panel);
    document.getElementById('closeBtn').onclick=removePanel;
  }

  async function boot(){
    const asin=getASIN();
    if(!asin||asin===lastASIN) return;
    lastASIN=asin;

    const price=parsePrice(txt('.a-price .a-offscreen'));
    const rating=txt('.a-icon-alt');
    const reviews=parseInt(txt('#acrCustomerReviewText').replace(/\D/g,''));
    const ranking=getRanking();
    const vendors=getVendors();
    const monthly=getMonthly();
    const offers=await fetchOfferListing(asin);

    render({price,rating,reviews,ranking,vendors,monthly,offers});
  }

  const push=history.pushState;
  history.pushState=function(){push.apply(this,arguments);setTimeout(boot,800);};
  const replace=history.replaceState;
  history.replaceState=function(){replace.apply(this,arguments);setTimeout(boot,800);};

  new MutationObserver(()=>boot()).observe(document.body,{childList:true,subtree:true});
  setTimeout(boot,1200);
})();