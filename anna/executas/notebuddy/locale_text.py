"""Static presentation resources; no provider calls or save writes."""
import re
from localization_data import CATALOG
LANGUAGES=('en','ko','ja','zh-Hans','zh-Hant')
_templates=[]
for source,translations in CATALOG.items():
    if re.search(r'\{p\d+\}',source):
        keys=re.findall(r'\{p\d+\}',source)
        pattern=re.compile('^'+re.sub(r'\\\{p\d+\\\}',r'([\\s\\S]*?)',re.escape(source))+'$')
        _templates.append((source,pattern,keys,translations))
_templates.sort(key=lambda row:-len(row[0]))
def locale_text(language,value):
    if language in ('en','ko') or not isinstance(value,str) or not value:return value
    translated=CATALOG.get(value,{}).get(language)
    if translated:return translated
    for _,pattern,keys,translations in _templates:
        match=pattern.fullmatch(value)
        if match and language in translations:
            params=dict(zip(keys,match.groups()))
            return re.sub(r'\{p\d+\}',lambda m:params[m[0]],translations[language])
    return value
