# Sermon Genre Auto-Generation Guide

## Status: ✅ APPLIED

This SQL migration adds automatic genre generation to the `sermons` table based on sermon titles. When a new sermon is created or an existing one's title is updated, the genre is automatically set based on keyword matching.

**Applied:** February 11, 2026

## Overview

- Genres are auto-generated based on sermon title keywords
- New sermons automatically get assigned a genre on INSERT
- Genres update if sermon titles change
- Existing sermons without genres have been backfilled
- Manual genre edits are preserved (trigger only fills empty values)

## Genres Supported

The system generates one of the following genres based on title keywords:

| Genre                         | Keywords                                    |
| ----------------------------- | ------------------------------------------- |
| **Faith & Belief**            | faith, belief, trust                        |
| **Prayer & Worship**          | prayer, worship, praise                     |
| **Healing & Miracles**        | healing, miracle, heal, sick                |
| **Prosperity & Blessings**    | prosperity, blessing, abundance, increase   |
| **Salvation & Redemption**    | salvation, redemption, saved, born again    |
| **Love & Relationships**      | love, relationship, marriage, family        |
| **Christian Life**            | christian, godly, holy, righteous           |
| **Discipleship & Growth**     | disciple, growth, mature, develop           |
| **Overcoming & Victory**      | overcome, victory, conquer, tribulation     |
| **Bible Study**               | study, lesson, teach, exposition            |
| **Church & Community**        | church, community, fellowship, congregation |
| **Repentance & Forgiveness**  | repent, forgive, confession, sin            |
| **Wisdom & Knowledge**        | wisdom, knowledge, understand, truth        |
| **Holiness & Sanctification** | holy, sanctif, pure, clean                  |
| **Spiritual Warfare**         | warfare, spiritual, demon, evil, battle     |
| **Prophecy & Revelation**     | prophecy, revelation, prophetic, vision     |
| **Hope & Encouragement**      | hope, encourage, comfort, peace             |
| **General Teaching**          | _default for no matches_                    |

## What the Migration Does

1. **Creates `generate_sermon_genre()` function**
   - Takes a sermon title as input
   - Returns the most appropriate genre based on keywords
   - Case-insensitive matching

2. **Creates `trigger_set_sermon_genre()` function**
   - Trigger function that gets called before sermons are inserted or updated
   - Only sets genre if it's currently empty/null
   - Allows manual overrides

3. **Creates two triggers**
   - `sermon_genre_insert`: Runs on INSERT to auto-populate new sermons
   - `sermon_genre_update`: Runs on title UPDATE to refresh genre if title changes

4. **Updates existing sermons**
   - Automatically backfills any existing sermons without a genre

## Examples

- Title: "The Power of Prayer" → Genre: "Prayer & Worship"
- Title: "Walking in Faith" → Genre: "Faith & Belief"
- Title: "How to Overcome Trials" → Genre: "Overcoming & Victory"
- Title: "Building Strong Families" → Genre: "Love & Relationships"
- Title: "Sunday Service Teachings" → Genre: "General Teaching" (no matching keywords)

## Customization

To add more genres or keywords:

1. Edit the CASE statement in the `generate_sermon_genre()` function
2. Add new WHEN conditions with your keywords and desired genre
3. Re-run the SQL to update the function

Example:

```sql
WHEN title_lower LIKE '%freedom%' OR title_lower LIKE '%liberty%' THEN
  genre := 'Freedom & Liberty';
```

## Notes

- Genres are case-insensitive during matching
- Only the first matching genre is assigned (based on order)
- Manual genre edits are preserved (trigger only sets if empty)
- To force re-generation, set genre to NULL and the trigger will recalculate
