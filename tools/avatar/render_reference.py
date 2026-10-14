"""Reference renderer for the avatar pack. Uses only assets/avatar/. Mirrors what the app must do.
Usage: python avatar_render_reference.py  -> writes reference_*.png
"""
import json,os
import numpy as np
from PIL import Image
ROOT=os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','..','assets','avatar')
CAT=json.load(open(os.path.join(ROOT,'avatar.catalogue.json')))
W,H=CAT['canvas']
def full(name):
  f=CAT['files'][name];im=Image.open(os.path.join(ROOT,f['file']))
  c=Image.new(im.mode,(W,H),0 if im.mode=='L' else (0,0,0,0));c.paste(im,(f['x'],f['y']));return c
def erase(img,masks):
  a=np.array(img).astype(np.float32)
  for m in masks:
    if m:a[...,3]*=1-np.array(full(m)).astype(np.float32)/255
  return Image.fromarray(a.astype(np.uint8))
def render(base,top=None,bottoms=None,head=None,eyesClosed=False,bg=(203,202,202,255)):
  B=CAT['bases'][base];I=CAT['items'];L=[]
  def add(layer,img):L.append((layer,len(L),img))
  if top and I[top]['slot']=='full':bottoms=None
  T=I[top] if top else None;Bt=I[bottoms] if bottoms else None
  bodyM=[];armM=[]
  if T:bodyM.append(T['topBodyHide']);armM.append(T['topArmsHide'])
  if Bt:bodyM+=[Bt['bottomsBodyHide'],B['bandHideMask']];armM.append(Bt['bottomsArmsHide'])
  hair=I[head]['hairHide'][base] if head and 'hairHide' in I[head] else None
  add(-1,full(B['thighs']['piece']))
  add(0,erase(full(B['body']['piece']),bodyM+[hair]))
  if eyesClosed:add(1,full(B['eyesClosed']['piece']))
  add(65,erase(full(B['arms']['piece']),armM))
  if 'frontHair' in B:add(80,erase(full(B['frontHair']['piece']),[hair]))
  add(90,full(B['hands']['piece']))
  if T:
    P=T['pieces']
    if T['slot']=='full':add(P['full']['layer'],full(P['full']['piece']))
    else:
      add(P['top']['layer'],full(P['top']['piece']))
      if Bt and bottoms!=top and Bt['waist']>T['waist']+4:
        e=np.array(full(P['topExtension']['piece']));e[Bt['waist']+6:,:,3]=0;add(P['topExtension']['layer'],Image.fromarray(e))
      add(70,full(P['sleeves']['piece']))
      if 'overlay' in P:add(75,full(P['overlay']['piece']))
      if 'back' in P:add(-5,full(P['back']['piece']))
  if Bt:
    bp=Bt['pieces']['bottoms'];im=full(bp['piece'])
    if T and 'overlayTop' in T and bp['layer']>T['pieces']['top']['layer']:
      a=np.array(im);a[:T['overlayTop'],:,3]=0;im=Image.fromarray(a)
    add(bp['layer'],im)
    if not T:add(10,full(Bt['pieces']['shirtStrip']['piece']))
  if head and 'head' in I[head]['pieces']:
    hp=I[head]['pieces']['head'];add(hp['layer'],full(hp['piece']))
  c=Image.new('RGBA',(W,H),bg)
  for _,_,im in sorted(L,key=lambda z:(z[0],z[1])):c.alpha_composite(im)
  return c
if __name__=='__main__':
  for i,k in enumerate([dict(base='b1',top='cavalier',bottoms='cavalier',head='cavalier'),dict(base='b6',top='trooper',bottoms='courtlady',head='trooper'),dict(base='b3',top='senator',head='senator')]):
    render(**k).save(f'reference_{i+1}.png')
