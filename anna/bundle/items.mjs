// Cosmetic catalog. Regional rewards are granted by the game engine; equipment is deferred.
export const regions=['common','hellgate','icekingdom','dreamforest','sunkenpalace','clockworkcity'];
export const slots=['head','neck','back','aura'];
const item=(id,region,slot,name,description,rarity='standard',reward='regional')=>({id,region,slot,name,description,rarity,reward,icon:`assets/items-v1/${id}.png`});
export const items=[
 item('traveler-hat','common','head',['Little Traveler’s Hat','작은 여행자 모자'],['A leaf tucked into the band marks the first page of a little adventure.','모자띠에 꽂힌 작은 잎이 첫 모험의 시작을 알려 줘요.'],'standard','gift'),
 item('red-scarf','common','neck',['Red Scarf','빨간 목도리'],['A warm knot to carry a little comfort along every unfamiliar path.','낯선 길에서도 포근함을 잊지 않도록 꼭 묶은 목도리예요.'],'standard','coins'),
 item('traveler-cape','common','back',['Beginner’s Cape','초보 탐험가 망토'],['A light green cape with plenty of room for tomorrow’s adventures.','내일의 모험을 기다리는 가볍고 초록빛인 망토예요.'],'standard','coins'),
 item('little-starlight','common','aura',['Little Starlight','작은 별빛'],['A handful of friendly stars follows even the smallest explorer.','아주 작은 탐험가의 곁에도 다정한 별들이 따라와요.'],'standard','coins'),
 item('ember-horns','hellgate','head',['Ember Horns','잿불 뿔 장식'],['Two ember-tipped ornaments remember the glow beyond the sealed gate.','봉인된 문 너머의 빛을 간직한 두 개의 뿔 장식이에요.']),
 item('sealstone-pendant','hellgate','neck',['Sealstone Pendant','봉인석 펜던트'],['A cooled fragment of the gate’s seal holds one quiet spark.','차갑게 식은 봉인석 조각 속에 작은 불씨 하나가 남아 있어요.']),
 item('blazing-cape','hellgate','back',['Blazing Cape','타오르는 망토'],['A guardian’s ember lights the hem without burning its wearer.','수호자가 남긴 잿불이 주인을 태우지 않고 끝자락을 밝혀요.'],'rare','milestone'),
 item('drifting-embers','hellgate','aura',['Drifting Embers','떠도는 잿불'],['Gentle sparks trace a warm circle around their new traveling friend.','온화한 불씨들이 새 여행 친구의 주위에 둥근 빛을 그려요.']),
 item('frost-crown','icekingdom','head',['Frost Crown','서리 왕관'],['A blue crystal remembers the stillness at the heart of the frozen palace.','푸른 결정에 얼어붙은 왕궁 깊은 곳의 고요함이 담겨 있어요.'],'rare','milestone'),
 item('snowflake-scarf','icekingdom','neck',['Snowflake Scarf','눈꽃 목도리'],['Snowflake stitches bring the winter kingdom’s beauty, with none of its chill.','겨울 왕국의 아름다움만 담고 추위는 남겨 둔 눈꽃 목도리예요.']),
 item('aurora-cape','icekingdom','back',['Aurora Cape','오로라 망토'],['Pale violet and turquoise folds recall a sky seen through ice.','얼음 너머로 보았던 하늘이 연보라와 청록빛 주름에 남아 있어요.']),
 item('snowfall','icekingdom','aura',['Drifting Snow','흩날리는 눈송이'],['A tiny, quiet snowfall follows its companion without ever making them cold.','친구가 춥지 않을 만큼만 작은 눈송이들이 조용히 따라와요.']),
 item('moonflower-crown','dreamforest','head',['Moonlit Flower Crown','달빛 화관'],['Pale flowers bloom only where the forest’s wandering paths meet.','숲의 떠도는 길들이 만나는 곳에서만 피는 꽃을 엮었어요.']),
 item('dewdrop-necklace','dreamforest','neck',['Dewdrop Necklace','이슬방울 목걸이'],['One morning dewdrop keeps a reflection of the forest’s forgotten dream.','아침 이슬 한 방울에 숲이 잊어버린 꿈이 비쳐요.']),
 item('butterfly-cape','dreamforest','back',['Butterfly Cape','나비 망토'],['A cloth cape shaped like butterfly wings, made for dreaming rather than flight.','날기보다 꿈꾸기 위해 만든, 나비 날개 모양의 천 망토예요.']),
 item('firefly-orbit','dreamforest','aura',['Firefly Companions','반딧불 무리'],['The forest’s smallest guides have decided to keep you company.','숲에서 가장 작은 길잡이들이 함께 여행하기로 했어요.'],'rare','milestone'),
 item('coral-tiara','sunkenpalace','head',['Coral Pearl Tiara','산호 진주 왕관'],['Coral branches cradle a pearl that remembers the drowned palace’s last moonlit ball.','산호 가지가 품은 진주에 침몰한 왕궁의 마지막 달빛 무도회가 남아 있어요.'],'rare','milestone'),
 item('pearl-pendant','sunkenpalace','neck',['Seashell Pearl Pendant','진주 조개 펜던트'],['A little shell keeps a quiet pearl safe, like a promise brought home from the deep.','작은 조개가 심해에서 가져온 약속처럼 고요한 진주를 품고 있어요.']),
 item('tide-cape','sunkenpalace','back',['Tide Cape','물결 망토'],['Foam-colored stitches follow the tide along a soft cape rescued from the royal wardrobe.','왕궁 옷장에서 건져 낸 부드러운 망토에 포말빛 바느질이 물결을 따라 흘러요.']),
 item('bubble-orbit','sunkenpalace','aura',['Deep-Sea Bubbles','심해 물방울'],['Pearl-bright bubbles drift beside their companion, carrying a tiny piece of the quiet sea.','진주처럼 빛나는 물방울이 고요한 바다 한 조각을 품고 친구 곁을 맴돌아요.']),
 item('gear-goggles','clockworkcity','head',['Clockmaker’s Goggles','태엽 고글'],['Amber lenses once helped a little clockmaker find the city’s smallest missing gears.','작은 시계공이 도시에서 잃어버린 톱니를 찾을 때 쓰던 호박빛 고글이에요.']),
 item('clockwork-locket','clockworkcity','neck',['Pocket-Watch Necklace','회중시계 목걸이'],['Its hands rest at a treasured moment, keeping a memory rather than measuring the hours.','소중한 순간에 멈춘 바늘이 시간을 재는 대신 추억 하나를 간직해요.']),
 item('brass-cape','clockworkcity','back',['Brass-Gear Cape','황동 톱니 망토'],['Golden gear stitches decorate a navy cloth cape from the city’s forgotten workshop.','잊힌 공방에서 발견한 남색 천 망토에 금빛 톱니 무늬가 수놓여 있어요.']),
 item('gear-orbit','clockworkcity','aura',['Little Clockwork Orbit','작은 태엽 무리'],['Loose cogs float in a gentle rhythm, as if the old city has found a new heartbeat.','낱개의 톱니들이 옛 도시가 새 심장을 찾은 듯 부드러운 박자로 맴돌아요.'],'rare','milestone'),
];

export function selectItems({region='all',slot='all',query='',language='en'}={}){
 const index=language==='ko'?1:0,needle=query.trim().toLocaleLowerCase();
 return items.filter(i=>(region==='all'||i.region===region)&&(slot==='all'||i.slot===slot)&&(!needle||`${i.name[index]} ${i.description[index]}`.toLocaleLowerCase().includes(needle)));
}

// A slot describes a required attachment area, never a reason to add anatomy.
export const fitRules={
 head:['Needs visible space above the head. Fit around existing ears, horns and leaves; never add a new head or horns to the body.','머리 위에 장식할 공간이 필요해요. 기존 귀·뿔·잎을 보존하며 장식을 맞추고, 몸에 새 머리나 뿔을 만들지 않아요.'],
 neck:['Needs a visible neck or suitable upper-body attachment area. Without either, it cannot be worn. A hidden or unclear area needs confirmation.','목이나 상체에 두를 수 있는 부위가 필요해요. 둘 다 없으면 착용할 수 없고, 가려지거나 불분명하면 확인이 필요해요.'],
 back:['Needs a visible torso or back attachment area. Preserve existing wings and body shape; never invent a torso to hold the cape.','몸통이나 등에 고정할 부위가 필요해요. 기존 날개와 몸 형태를 보존하고 망토를 위해 새 몸통을 만들지 않아요.'],
 aura:['Floats around the companion and needs no hands, feet or attachment area. It preserves the original body shape.','친구 주위에 떠 있는 장식이라 손·발이나 고정할 부위가 필요 없어요. 원래 몸 형태를 그대로 유지해요.'],
};
