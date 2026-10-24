"""Bounded cosmetic ownership. Only a committed final guardian win grants items."""
import copy

# Three standard rewards, then the rare regional reward. No random rerolls.
REWARDS = {
    'hellgate': ('ember-horns', 'sealstone-pendant', 'drifting-embers', 'blazing-cape'),
    'icekingdom': ('snowflake-scarf', 'aurora-cape', 'snowfall', 'frost-crown'),
    'dreamforest': ('moonflower-crown', 'dewdrop-necklace', 'butterfly-cape', 'firefly-orbit'),
    'sunkenpalace': ('pearl-pendant', 'tide-cape', 'bubble-orbit', 'coral-tiara'),
    'clockworkcity': ('gear-goggles', 'clockwork-locket', 'brass-cape', 'gear-orbit'),
}
IDS = frozenset(item for region in REWARDS.values() for item in region)


def validate(st):
    owned = st.get('collectibles', {})
    if (not isinstance(owned, dict) or not set(owned) <= IDS or
            any(type(count) is not int or count != 1 for count in owned.values())):
        raise ValueError('Invalid cosmetic ownership')


    history = st.get('collectible_discoveries', [])
    if not isinstance(history, list) or any(x not in IDS for x in history) or len(history) != len(set(history)):
        raise ValueError('Invalid collection history')


def discovered(st):
    return set(st.get('collectible_discoveries', [])) | set(st.get('collectibles', {}))


def view(st):
    return copy.deepcopy(st.get('collectibles', {}))


def award(st, region):
    """The caller commits ownership, coins and the clear receipt together."""
    validate(st)
    owned = st.get('collectibles', {})
    item = next((key for key in REWARDS[region] if key not in owned), None)
    if item:
        st.setdefault('collectibles', {})[item] = 1
    return item
