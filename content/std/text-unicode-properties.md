Import as `GeneralCategory` with `import silk.text.unicode_properties { GeneralCategory }`.

Public declarations: 13.

::Anchor{id="GeneralCategory"}

## `GeneralCategory`

```silk
pub enum GeneralCategory
```

The Unicode `General_Category` property: the general category of a character, such as an
uppercase letter or a nonspacing mark.

### Details
[`GeneralCategory.of`](#GeneralCategory.impl.of) reads the value of one code point. A code point with no explicit value,
or a value past U+10FFFF, gets the Unicode default, `Cn`.

::Anchor{id="GeneralCategory.Cc"}

### `Cc`

```silk
Cc
```

Control (also `cntrl`).

::Anchor{id="GeneralCategory.Cf"}

### `Cf`

```silk
Cf
```

Format.

::Anchor{id="GeneralCategory.Cn"}

### `Cn`

```silk
Cn
```

Unassigned.

::Anchor{id="GeneralCategory.Co"}

### `Co`

```silk
Co
```

Private Use.

::Anchor{id="GeneralCategory.Cs"}

### `Cs`

```silk
Cs
```

Surrogate.

::Anchor{id="GeneralCategory.Ll"}

### `Ll`

```silk
Ll
```

Lowercase Letter.

::Anchor{id="GeneralCategory.Lm"}

### `Lm`

```silk
Lm
```

Modifier Letter.

::Anchor{id="GeneralCategory.Lo"}

### `Lo`

```silk
Lo
```

Other Letter.

::Anchor{id="GeneralCategory.Lt"}

### `Lt`

```silk
Lt
```

Titlecase Letter.

::Anchor{id="GeneralCategory.Lu"}

### `Lu`

```silk
Lu
```

Uppercase Letter.

::Anchor{id="GeneralCategory.Mc"}

### `Mc`

```silk
Mc
```

Spacing Mark.

::Anchor{id="GeneralCategory.Me"}

### `Me`

```silk
Me
```

Enclosing Mark.

::Anchor{id="GeneralCategory.Mn"}

### `Mn`

```silk
Mn
```

Nonspacing Mark.

::Anchor{id="GeneralCategory.Nd"}

### `Nd`

```silk
Nd
```

Decimal Number (also `digit`).

::Anchor{id="GeneralCategory.Nl"}

### `Nl`

```silk
Nl
```

Letter Number.

::Anchor{id="GeneralCategory.No"}

### `No`

```silk
No
```

Other Number.

::Anchor{id="GeneralCategory.Pc"}

### `Pc`

```silk
Pc
```

Connector Punctuation.

::Anchor{id="GeneralCategory.Pd"}

### `Pd`

```silk
Pd
```

Dash Punctuation.

::Anchor{id="GeneralCategory.Pe"}

### `Pe`

```silk
Pe
```

Close Punctuation.

::Anchor{id="GeneralCategory.Pf"}

### `Pf`

```silk
Pf
```

Final Punctuation.

::Anchor{id="GeneralCategory.Pi"}

### `Pi`

```silk
Pi
```

Initial Punctuation.

::Anchor{id="GeneralCategory.Po"}

### `Po`

```silk
Po
```

Other Punctuation.

::Anchor{id="GeneralCategory.Ps"}

### `Ps`

```silk
Ps
```

Open Punctuation.

::Anchor{id="GeneralCategory.Sc"}

### `Sc`

```silk
Sc
```

Currency Symbol.

::Anchor{id="GeneralCategory.Sk"}

### `Sk`

```silk
Sk
```

Modifier Symbol.

::Anchor{id="GeneralCategory.Sm"}

### `Sm`

```silk
Sm
```

Math Symbol.

::Anchor{id="GeneralCategory.So"}

### `So`

```silk
So
```

Other Symbol.

::Anchor{id="GeneralCategory.Zl"}

### `Zl`

```silk
Zl
```

Line Separator.

::Anchor{id="GeneralCategory.Zp"}

### `Zp`

```silk
Zp
```

Paragraph Separator.

::Anchor{id="GeneralCategory.Zs"}

### `Zs`

```silk
Zs
```

Space Separator.

::Anchor{id="GeneralCategory.impl"}

## Implementation `GeneralCategory`

```silk
impl GeneralCategory
```

::Anchor{id="GeneralCategory.impl.of"}

### Associated function `of`

```silk
pub fn of(cp: u32) -> GeneralCategory
```

Returns the `General_Category` of the code point `cp`. A value past U+10FFFF gets `Cn`.

::Anchor{id="GeneralCategory.impl.fromTableValue"}

### Associated function `fromTableValue`

```silk
pub fn fromTableValue(value: u32) -> GeneralCategory
```

Returns the value for the packed number `value` from `unicode_data.generalCategory`. An
unknown number gives `Cn`.

::Anchor{id="CanonicalCombiningClass"}

## `CanonicalCombiningClass`

```silk
pub enum CanonicalCombiningClass
```

The Unicode `Canonical_Combining_Class` property: the canonical combining class of a character,
which orders combining marks during normalization.

### Details
[`CanonicalCombiningClass.of`](#CanonicalCombiningClass.impl.of) reads the value of one code point. A code point with no explicit
value, or a value past U+10FFFF, gets the Unicode default, `Not_Reordered`.

::Anchor{id="CanonicalCombiningClass.Not_Reordered"}

### `Not_Reordered`

```silk
Not_Reordered
```

Not Reordered (also `NR`).

::Anchor{id="CanonicalCombiningClass.Overlay"}

### `Overlay`

```silk
Overlay
```

Overlay (also `OV`).

::Anchor{id="CanonicalCombiningClass.Han_Reading"}

### `Han_Reading`

```silk
Han_Reading
```

Han Reading (also `HANR`).

::Anchor{id="CanonicalCombiningClass.Nukta"}

### `Nukta`

```silk
Nukta
```

Nukta (also `NK`).

::Anchor{id="CanonicalCombiningClass.Kana_Voicing"}

### `Kana_Voicing`

```silk
Kana_Voicing
```

Kana Voicing (also `KV`).

::Anchor{id="CanonicalCombiningClass.Virama"}

### `Virama`

```silk
Virama
```

Virama (also `VR`).

::Anchor{id="CanonicalCombiningClass.CCC10"}

### `CCC10`

```silk
CCC10
```

CCC10.

::Anchor{id="CanonicalCombiningClass.CCC11"}

### `CCC11`

```silk
CCC11
```

CCC11.

::Anchor{id="CanonicalCombiningClass.CCC12"}

### `CCC12`

```silk
CCC12
```

CCC12.

::Anchor{id="CanonicalCombiningClass.CCC13"}

### `CCC13`

```silk
CCC13
```

CCC13.

::Anchor{id="CanonicalCombiningClass.CCC14"}

### `CCC14`

```silk
CCC14
```

CCC14.

::Anchor{id="CanonicalCombiningClass.CCC15"}

### `CCC15`

```silk
CCC15
```

CCC15.

::Anchor{id="CanonicalCombiningClass.CCC16"}

### `CCC16`

```silk
CCC16
```

CCC16.

::Anchor{id="CanonicalCombiningClass.CCC17"}

### `CCC17`

```silk
CCC17
```

CCC17.

::Anchor{id="CanonicalCombiningClass.CCC18"}

### `CCC18`

```silk
CCC18
```

CCC18.

::Anchor{id="CanonicalCombiningClass.CCC19"}

### `CCC19`

```silk
CCC19
```

CCC19.

::Anchor{id="CanonicalCombiningClass.CCC20"}

### `CCC20`

```silk
CCC20
```

CCC20.

::Anchor{id="CanonicalCombiningClass.CCC21"}

### `CCC21`

```silk
CCC21
```

CCC21.

::Anchor{id="CanonicalCombiningClass.CCC22"}

### `CCC22`

```silk
CCC22
```

CCC22.

::Anchor{id="CanonicalCombiningClass.CCC23"}

### `CCC23`

```silk
CCC23
```

CCC23.

::Anchor{id="CanonicalCombiningClass.CCC24"}

### `CCC24`

```silk
CCC24
```

CCC24.

::Anchor{id="CanonicalCombiningClass.CCC25"}

### `CCC25`

```silk
CCC25
```

CCC25.

::Anchor{id="CanonicalCombiningClass.CCC26"}

### `CCC26`

```silk
CCC26
```

CCC26.

::Anchor{id="CanonicalCombiningClass.CCC27"}

### `CCC27`

```silk
CCC27
```

CCC27.

::Anchor{id="CanonicalCombiningClass.CCC28"}

### `CCC28`

```silk
CCC28
```

CCC28.

::Anchor{id="CanonicalCombiningClass.CCC29"}

### `CCC29`

```silk
CCC29
```

CCC29.

::Anchor{id="CanonicalCombiningClass.CCC30"}

### `CCC30`

```silk
CCC30
```

CCC30.

::Anchor{id="CanonicalCombiningClass.CCC31"}

### `CCC31`

```silk
CCC31
```

CCC31.

::Anchor{id="CanonicalCombiningClass.CCC32"}

### `CCC32`

```silk
CCC32
```

CCC32.

::Anchor{id="CanonicalCombiningClass.CCC33"}

### `CCC33`

```silk
CCC33
```

CCC33.

::Anchor{id="CanonicalCombiningClass.CCC34"}

### `CCC34`

```silk
CCC34
```

CCC34.

::Anchor{id="CanonicalCombiningClass.CCC35"}

### `CCC35`

```silk
CCC35
```

CCC35.

::Anchor{id="CanonicalCombiningClass.CCC36"}

### `CCC36`

```silk
CCC36
```

CCC36.

::Anchor{id="CanonicalCombiningClass.CCC84"}

### `CCC84`

```silk
CCC84
```

CCC84.

::Anchor{id="CanonicalCombiningClass.CCC91"}

### `CCC91`

```silk
CCC91
```

CCC91.

::Anchor{id="CanonicalCombiningClass.CCC103"}

### `CCC103`

```silk
CCC103
```

CCC103.

::Anchor{id="CanonicalCombiningClass.CCC107"}

### `CCC107`

```silk
CCC107
```

CCC107.

::Anchor{id="CanonicalCombiningClass.CCC118"}

### `CCC118`

```silk
CCC118
```

CCC118.

::Anchor{id="CanonicalCombiningClass.CCC122"}

### `CCC122`

```silk
CCC122
```

CCC122.

::Anchor{id="CanonicalCombiningClass.CCC129"}

### `CCC129`

```silk
CCC129
```

CCC129.

::Anchor{id="CanonicalCombiningClass.CCC130"}

### `CCC130`

```silk
CCC130
```

CCC130.

::Anchor{id="CanonicalCombiningClass.CCC132"}

### `CCC132`

```silk
CCC132
```

CCC132.

::Anchor{id="CanonicalCombiningClass.CCC133"}

### `CCC133`

```silk
CCC133
```

CCC133.

::Anchor{id="CanonicalCombiningClass.Attached_Below_Left"}

### `Attached_Below_Left`

```silk
Attached_Below_Left
```

Attached Below Left (also `ATBL`).

::Anchor{id="CanonicalCombiningClass.Attached_Below"}

### `Attached_Below`

```silk
Attached_Below
```

Attached Below (also `ATB`).

::Anchor{id="CanonicalCombiningClass.Attached_Above"}

### `Attached_Above`

```silk
Attached_Above
```

Attached Above (also `ATA`).

::Anchor{id="CanonicalCombiningClass.Attached_Above_Right"}

### `Attached_Above_Right`

```silk
Attached_Above_Right
```

Attached Above Right (also `ATAR`).

::Anchor{id="CanonicalCombiningClass.Below_Left"}

### `Below_Left`

```silk
Below_Left
```

Below Left (also `BL`).

::Anchor{id="CanonicalCombiningClass.Below"}

### `Below`

```silk
Below
```

Below (also `B`).

::Anchor{id="CanonicalCombiningClass.Below_Right"}

### `Below_Right`

```silk
Below_Right
```

Below Right (also `BR`).

::Anchor{id="CanonicalCombiningClass.Left"}

### `Left`

```silk
Left
```

Left (also `L`).

::Anchor{id="CanonicalCombiningClass.Right"}

### `Right`

```silk
Right
```

Right (also `R`).

::Anchor{id="CanonicalCombiningClass.Above_Left"}

### `Above_Left`

```silk
Above_Left
```

Above Left (also `AL`).

::Anchor{id="CanonicalCombiningClass.Above"}

### `Above`

```silk
Above
```

Above (also `A`).

::Anchor{id="CanonicalCombiningClass.Above_Right"}

### `Above_Right`

```silk
Above_Right
```

Above Right (also `AR`).

::Anchor{id="CanonicalCombiningClass.Double_Below"}

### `Double_Below`

```silk
Double_Below
```

Double Below (also `DB`).

::Anchor{id="CanonicalCombiningClass.Double_Above"}

### `Double_Above`

```silk
Double_Above
```

Double Above (also `DA`).

::Anchor{id="CanonicalCombiningClass.Iota_Subscript"}

### `Iota_Subscript`

```silk
Iota_Subscript
```

Iota Subscript (also `IS`).

::Anchor{id="CanonicalCombiningClass.impl"}

## Implementation `CanonicalCombiningClass`

```silk
impl CanonicalCombiningClass
```

::Anchor{id="CanonicalCombiningClass.impl.of"}

### Associated function `of`

```silk
pub fn of(cp: u32) -> CanonicalCombiningClass
```

Returns the `Canonical_Combining_Class` of the code point `cp`. A value past U+10FFFF gets
`Not_Reordered`.

::Anchor{id="CanonicalCombiningClass.impl.fromTableValue"}

### Associated function `fromTableValue`

```silk
pub fn fromTableValue(value: u32) -> CanonicalCombiningClass
```

Returns the value for the packed number `value` from `unicode_data.combiningClass`. An unknown
number gives `Not_Reordered`.

::Anchor{id="CanonicalCombiningClass.impl.number"}

### Method `number`

```silk
pub fn number(self: Self) -> u8
```

Returns the numeric combining class, from 0 to 254. Canonical ordering sorts marks by it.

::Anchor{id="BidiClass"}

## `BidiClass`

```silk
pub enum BidiClass
```

The Unicode `Bidi_Class` property: the bidirectional class of a character, which the Unicode
Bidirectional Algorithm (UAX #9) reads.

### Details
[`BidiClass.of`](#BidiClass.impl.of) reads the value of one code point. A code point with no explicit value, or a
value past U+10FFFF, gets the Unicode default, `L`.

::Anchor{id="BidiClass.AL"}

### `AL`

```silk
AL
```

Arabic Letter.

::Anchor{id="BidiClass.AN"}

### `AN`

```silk
AN
```

Arabic Number.

::Anchor{id="BidiClass.B"}

### `B`

```silk
B
```

Paragraph Separator.

::Anchor{id="BidiClass.BN"}

### `BN`

```silk
BN
```

Boundary Neutral.

::Anchor{id="BidiClass.CS"}

### `CS`

```silk
CS
```

Common Separator.

::Anchor{id="BidiClass.EN"}

### `EN`

```silk
EN
```

European Number.

::Anchor{id="BidiClass.ES"}

### `ES`

```silk
ES
```

European Separator.

::Anchor{id="BidiClass.ET"}

### `ET`

```silk
ET
```

European Terminator.

::Anchor{id="BidiClass.FSI"}

### `FSI`

```silk
FSI
```

First Strong Isolate.

::Anchor{id="BidiClass.L"}

### `L`

```silk
L
```

Left To Right.

::Anchor{id="BidiClass.LRE"}

### `LRE`

```silk
LRE
```

Left To Right Embedding.

::Anchor{id="BidiClass.LRI"}

### `LRI`

```silk
LRI
```

Left To Right Isolate.

::Anchor{id="BidiClass.LRO"}

### `LRO`

```silk
LRO
```

Left To Right Override.

::Anchor{id="BidiClass.NSM"}

### `NSM`

```silk
NSM
```

Nonspacing Mark.

::Anchor{id="BidiClass.ON"}

### `ON`

```silk
ON
```

Other Neutral.

::Anchor{id="BidiClass.PDF"}

### `PDF`

```silk
PDF
```

Pop Directional Format.

::Anchor{id="BidiClass.PDI"}

### `PDI`

```silk
PDI
```

Pop Directional Isolate.

::Anchor{id="BidiClass.R"}

### `R`

```silk
R
```

Right To Left.

::Anchor{id="BidiClass.RLE"}

### `RLE`

```silk
RLE
```

Right To Left Embedding.

::Anchor{id="BidiClass.RLI"}

### `RLI`

```silk
RLI
```

Right To Left Isolate.

::Anchor{id="BidiClass.RLO"}

### `RLO`

```silk
RLO
```

Right To Left Override.

::Anchor{id="BidiClass.S"}

### `S`

```silk
S
```

Segment Separator.

::Anchor{id="BidiClass.WS"}

### `WS`

```silk
WS
```

White Space.

::Anchor{id="BidiClass.impl"}

## Implementation `BidiClass`

```silk
impl BidiClass
```

::Anchor{id="BidiClass.impl.of"}

### Associated function `of`

```silk
pub fn of(cp: u32) -> BidiClass
```

Returns the `Bidi_Class` of the code point `cp`. A value past U+10FFFF gets `L`.

::Anchor{id="BidiClass.impl.fromTableValue"}

### Associated function `fromTableValue`

```silk
pub fn fromTableValue(value: u32) -> BidiClass
```

Returns the value for the packed number `value` from `unicode_data.bidiClass`. An unknown
number gives `L`.

::Anchor{id="JoiningType"}

## `JoiningType`

```silk
pub enum JoiningType
```

The Unicode `Joining_Type` property: how a character joins its neighbors in cursive scripts such
as Arabic and Syriac.

### Details
[`JoiningType.of`](#JoiningType.impl.of) reads the value of one code point. A code point with no explicit value, or a
value past U+10FFFF, gets the Unicode default, `U`.

::Anchor{id="JoiningType.C"}

### `C`

```silk
C
```

Join Causing.

::Anchor{id="JoiningType.D"}

### `D`

```silk
D
```

Dual Joining.

::Anchor{id="JoiningType.L"}

### `L`

```silk
L
```

Left Joining.

::Anchor{id="JoiningType.R"}

### `R`

```silk
R
```

Right Joining.

::Anchor{id="JoiningType.T"}

### `T`

```silk
T
```

Transparent.

::Anchor{id="JoiningType.U"}

### `U`

```silk
U
```

Non Joining.

::Anchor{id="JoiningType.impl"}

## Implementation `JoiningType`

```silk
impl JoiningType
```

::Anchor{id="JoiningType.impl.of"}

### Associated function `of`

```silk
pub fn of(cp: u32) -> JoiningType
```

Returns the `Joining_Type` of the code point `cp`. A value past U+10FFFF gets `U`.

::Anchor{id="JoiningType.impl.fromTableValue"}

### Associated function `fromTableValue`

```silk
pub fn fromTableValue(value: u32) -> JoiningType
```

Returns the value for the packed number `value` from `unicode_data.joiningType`. An unknown
number gives `U`.

::Anchor{id="JoiningGroup"}

## `JoiningGroup`

```silk
pub enum JoiningGroup
```

The Unicode `Joining_Group` property: the group of letters in cursive scripts that share one
shape in joined forms.

### Details
[`JoiningGroup.of`](#JoiningGroup.impl.of) reads the value of one code point. A code point with no explicit value, or a
value past U+10FFFF, gets the Unicode default, `No_Joining_Group`.

::Anchor{id="JoiningGroup.African_Feh"}

### `African_Feh`

```silk
African_Feh
```

African Feh.

::Anchor{id="JoiningGroup.African_Noon"}

### `African_Noon`

```silk
African_Noon
```

African Noon.

::Anchor{id="JoiningGroup.African_Qaf"}

### `African_Qaf`

```silk
African_Qaf
```

African Qaf.

::Anchor{id="JoiningGroup.Ain"}

### `Ain`

```silk
Ain
```

Ain.

::Anchor{id="JoiningGroup.Alaph"}

### `Alaph`

```silk
Alaph
```

Alaph.

::Anchor{id="JoiningGroup.Alef"}

### `Alef`

```silk
Alef
```

Alef.

::Anchor{id="JoiningGroup.Beh"}

### `Beh`

```silk
Beh
```

Beh.

::Anchor{id="JoiningGroup.Beth"}

### `Beth`

```silk
Beth
```

Beth.

::Anchor{id="JoiningGroup.Burushaski_Yeh_Barree"}

### `Burushaski_Yeh_Barree`

```silk
Burushaski_Yeh_Barree
```

Burushaski Yeh Barree.

::Anchor{id="JoiningGroup.Crown_Ain"}

### `Crown_Ain`

```silk
Crown_Ain
```

Crown Ain.

::Anchor{id="JoiningGroup.Crown_Beh"}

### `Crown_Beh`

```silk
Crown_Beh
```

Crown Beh.

::Anchor{id="JoiningGroup.Crown_Feh"}

### `Crown_Feh`

```silk
Crown_Feh
```

Crown Feh.

::Anchor{id="JoiningGroup.Crown_Hah"}

### `Crown_Hah`

```silk
Crown_Hah
```

Crown Hah.

::Anchor{id="JoiningGroup.Crown_Heh"}

### `Crown_Heh`

```silk
Crown_Heh
```

Crown Heh.

::Anchor{id="JoiningGroup.Crown_Kaf"}

### `Crown_Kaf`

```silk
Crown_Kaf
```

Crown Kaf.

::Anchor{id="JoiningGroup.Crown_Meem"}

### `Crown_Meem`

```silk
Crown_Meem
```

Crown Meem.

::Anchor{id="JoiningGroup.Crown_Sad"}

### `Crown_Sad`

```silk
Crown_Sad
```

Crown Sad.

::Anchor{id="JoiningGroup.Crown_Seen"}

### `Crown_Seen`

```silk
Crown_Seen
```

Crown Seen.

::Anchor{id="JoiningGroup.Crown_Tah"}

### `Crown_Tah`

```silk
Crown_Tah
```

Crown Tah.

::Anchor{id="JoiningGroup.Dal"}

### `Dal`

```silk
Dal
```

Dal.

::Anchor{id="JoiningGroup.Dalath_Rish"}

### `Dalath_Rish`

```silk
Dalath_Rish
```

Dalath Rish.

::Anchor{id="JoiningGroup.E"}

### `E`

```silk
E
```

E.

::Anchor{id="JoiningGroup.Farsi_Yeh"}

### `Farsi_Yeh`

```silk
Farsi_Yeh
```

Farsi Yeh.

::Anchor{id="JoiningGroup.Fe"}

### `Fe`

```silk
Fe
```

Fe.

::Anchor{id="JoiningGroup.Feh"}

### `Feh`

```silk
Feh
```

Feh.

::Anchor{id="JoiningGroup.Final_Semkath"}

### `Final_Semkath`

```silk
Final_Semkath
```

Final Semkath.

::Anchor{id="JoiningGroup.Gaf"}

### `Gaf`

```silk
Gaf
```

Gaf.

::Anchor{id="JoiningGroup.Gamal"}

### `Gamal`

```silk
Gamal
```

Gamal.

::Anchor{id="JoiningGroup.Hah"}

### `Hah`

```silk
Hah
```

Hah.

::Anchor{id="JoiningGroup.Hanifi_Rohingya_Kinna_Ya"}

### `Hanifi_Rohingya_Kinna_Ya`

```silk
Hanifi_Rohingya_Kinna_Ya
```

Hanifi Rohingya Kinna Ya.

::Anchor{id="JoiningGroup.Hanifi_Rohingya_Pa"}

### `Hanifi_Rohingya_Pa`

```silk
Hanifi_Rohingya_Pa
```

Hanifi Rohingya Pa.

::Anchor{id="JoiningGroup.He"}

### `He`

```silk
He
```

He.

::Anchor{id="JoiningGroup.Heh"}

### `Heh`

```silk
Heh
```

Heh.

::Anchor{id="JoiningGroup.Heh_Goal"}

### `Heh_Goal`

```silk
Heh_Goal
```

Heh Goal.

::Anchor{id="JoiningGroup.Heth"}

### `Heth`

```silk
Heth
```

Heth.

::Anchor{id="JoiningGroup.Kaf"}

### `Kaf`

```silk
Kaf
```

Kaf.

::Anchor{id="JoiningGroup.Kaph"}

### `Kaph`

```silk
Kaph
```

Kaph.

::Anchor{id="JoiningGroup.Kashmiri_Yeh"}

### `Kashmiri_Yeh`

```silk
Kashmiri_Yeh
```

Kashmiri Yeh.

::Anchor{id="JoiningGroup.Khaph"}

### `Khaph`

```silk
Khaph
```

Khaph.

::Anchor{id="JoiningGroup.Knotted_Heh"}

### `Knotted_Heh`

```silk
Knotted_Heh
```

Knotted Heh.

::Anchor{id="JoiningGroup.Lam"}

### `Lam`

```silk
Lam
```

Lam.

::Anchor{id="JoiningGroup.Lamadh"}

### `Lamadh`

```silk
Lamadh
```

Lamadh.

::Anchor{id="JoiningGroup.Malayalam_Bha"}

### `Malayalam_Bha`

```silk
Malayalam_Bha
```

Malayalam Bha.

::Anchor{id="JoiningGroup.Malayalam_Ja"}

### `Malayalam_Ja`

```silk
Malayalam_Ja
```

Malayalam Ja.

::Anchor{id="JoiningGroup.Malayalam_Lla"}

### `Malayalam_Lla`

```silk
Malayalam_Lla
```

Malayalam Lla.

::Anchor{id="JoiningGroup.Malayalam_Llla"}

### `Malayalam_Llla`

```silk
Malayalam_Llla
```

Malayalam Llla.

::Anchor{id="JoiningGroup.Malayalam_Nga"}

### `Malayalam_Nga`

```silk
Malayalam_Nga
```

Malayalam Nga.

::Anchor{id="JoiningGroup.Malayalam_Nna"}

### `Malayalam_Nna`

```silk
Malayalam_Nna
```

Malayalam Nna.

::Anchor{id="JoiningGroup.Malayalam_Nnna"}

### `Malayalam_Nnna`

```silk
Malayalam_Nnna
```

Malayalam Nnna.

::Anchor{id="JoiningGroup.Malayalam_Nya"}

### `Malayalam_Nya`

```silk
Malayalam_Nya
```

Malayalam Nya.

::Anchor{id="JoiningGroup.Malayalam_Ra"}

### `Malayalam_Ra`

```silk
Malayalam_Ra
```

Malayalam Ra.

::Anchor{id="JoiningGroup.Malayalam_Ssa"}

### `Malayalam_Ssa`

```silk
Malayalam_Ssa
```

Malayalam Ssa.

::Anchor{id="JoiningGroup.Malayalam_Tta"}

### `Malayalam_Tta`

```silk
Malayalam_Tta
```

Malayalam Tta.

::Anchor{id="JoiningGroup.Manichaean_Aleph"}

### `Manichaean_Aleph`

```silk
Manichaean_Aleph
```

Manichaean Aleph.

::Anchor{id="JoiningGroup.Manichaean_Ayin"}

### `Manichaean_Ayin`

```silk
Manichaean_Ayin
```

Manichaean Ayin.

::Anchor{id="JoiningGroup.Manichaean_Beth"}

### `Manichaean_Beth`

```silk
Manichaean_Beth
```

Manichaean Beth.

::Anchor{id="JoiningGroup.Manichaean_Daleth"}

### `Manichaean_Daleth`

```silk
Manichaean_Daleth
```

Manichaean Daleth.

::Anchor{id="JoiningGroup.Manichaean_Dhamedh"}

### `Manichaean_Dhamedh`

```silk
Manichaean_Dhamedh
```

Manichaean Dhamedh.

::Anchor{id="JoiningGroup.Manichaean_Five"}

### `Manichaean_Five`

```silk
Manichaean_Five
```

Manichaean Five.

::Anchor{id="JoiningGroup.Manichaean_Gimel"}

### `Manichaean_Gimel`

```silk
Manichaean_Gimel
```

Manichaean Gimel.

::Anchor{id="JoiningGroup.Manichaean_Heth"}

### `Manichaean_Heth`

```silk
Manichaean_Heth
```

Manichaean Heth.

::Anchor{id="JoiningGroup.Manichaean_Hundred"}

### `Manichaean_Hundred`

```silk
Manichaean_Hundred
```

Manichaean Hundred.

::Anchor{id="JoiningGroup.Manichaean_Kaph"}

### `Manichaean_Kaph`

```silk
Manichaean_Kaph
```

Manichaean Kaph.

::Anchor{id="JoiningGroup.Manichaean_Lamedh"}

### `Manichaean_Lamedh`

```silk
Manichaean_Lamedh
```

Manichaean Lamedh.

::Anchor{id="JoiningGroup.Manichaean_Mem"}

### `Manichaean_Mem`

```silk
Manichaean_Mem
```

Manichaean Mem.

::Anchor{id="JoiningGroup.Manichaean_Nun"}

### `Manichaean_Nun`

```silk
Manichaean_Nun
```

Manichaean Nun.

::Anchor{id="JoiningGroup.Manichaean_One"}

### `Manichaean_One`

```silk
Manichaean_One
```

Manichaean One.

::Anchor{id="JoiningGroup.Manichaean_Pe"}

### `Manichaean_Pe`

```silk
Manichaean_Pe
```

Manichaean Pe.

::Anchor{id="JoiningGroup.Manichaean_Qoph"}

### `Manichaean_Qoph`

```silk
Manichaean_Qoph
```

Manichaean Qoph.

::Anchor{id="JoiningGroup.Manichaean_Resh"}

### `Manichaean_Resh`

```silk
Manichaean_Resh
```

Manichaean Resh.

::Anchor{id="JoiningGroup.Manichaean_Sadhe"}

### `Manichaean_Sadhe`

```silk
Manichaean_Sadhe
```

Manichaean Sadhe.

::Anchor{id="JoiningGroup.Manichaean_Samekh"}

### `Manichaean_Samekh`

```silk
Manichaean_Samekh
```

Manichaean Samekh.

::Anchor{id="JoiningGroup.Manichaean_Taw"}

### `Manichaean_Taw`

```silk
Manichaean_Taw
```

Manichaean Taw.

::Anchor{id="JoiningGroup.Manichaean_Ten"}

### `Manichaean_Ten`

```silk
Manichaean_Ten
```

Manichaean Ten.

::Anchor{id="JoiningGroup.Manichaean_Teth"}

### `Manichaean_Teth`

```silk
Manichaean_Teth
```

Manichaean Teth.

::Anchor{id="JoiningGroup.Manichaean_Thamedh"}

### `Manichaean_Thamedh`

```silk
Manichaean_Thamedh
```

Manichaean Thamedh.

::Anchor{id="JoiningGroup.Manichaean_Twenty"}

### `Manichaean_Twenty`

```silk
Manichaean_Twenty
```

Manichaean Twenty.

::Anchor{id="JoiningGroup.Manichaean_Waw"}

### `Manichaean_Waw`

```silk
Manichaean_Waw
```

Manichaean Waw.

::Anchor{id="JoiningGroup.Manichaean_Yodh"}

### `Manichaean_Yodh`

```silk
Manichaean_Yodh
```

Manichaean Yodh.

::Anchor{id="JoiningGroup.Manichaean_Zayin"}

### `Manichaean_Zayin`

```silk
Manichaean_Zayin
```

Manichaean Zayin.

::Anchor{id="JoiningGroup.Meem"}

### `Meem`

```silk
Meem
```

Meem.

::Anchor{id="JoiningGroup.Mim"}

### `Mim`

```silk
Mim
```

Mim.

::Anchor{id="JoiningGroup.No_Joining_Group"}

### `No_Joining_Group`

```silk
No_Joining_Group
```

No Joining Group.

::Anchor{id="JoiningGroup.Noon"}

### `Noon`

```silk
Noon
```

Noon.

::Anchor{id="JoiningGroup.Nun"}

### `Nun`

```silk
Nun
```

Nun.

::Anchor{id="JoiningGroup.Nya"}

### `Nya`

```silk
Nya
```

Nya.

::Anchor{id="JoiningGroup.Pe"}

### `Pe`

```silk
Pe
```

Pe.

::Anchor{id="JoiningGroup.Qaf"}

### `Qaf`

```silk
Qaf
```

Qaf.

::Anchor{id="JoiningGroup.Qaph"}

### `Qaph`

```silk
Qaph
```

Qaph.

::Anchor{id="JoiningGroup.Reh"}

### `Reh`

```silk
Reh
```

Reh.

::Anchor{id="JoiningGroup.Reversed_Pe"}

### `Reversed_Pe`

```silk
Reversed_Pe
```

Reversed Pe.

::Anchor{id="JoiningGroup.Rohingya_Yeh"}

### `Rohingya_Yeh`

```silk
Rohingya_Yeh
```

Rohingya Yeh.

::Anchor{id="JoiningGroup.Sad"}

### `Sad`

```silk
Sad
```

Sad.

::Anchor{id="JoiningGroup.Sadhe"}

### `Sadhe`

```silk
Sadhe
```

Sadhe.

::Anchor{id="JoiningGroup.Seen"}

### `Seen`

```silk
Seen
```

Seen.

::Anchor{id="JoiningGroup.Semkath"}

### `Semkath`

```silk
Semkath
```

Semkath.

::Anchor{id="JoiningGroup.Shin"}

### `Shin`

```silk
Shin
```

Shin.

::Anchor{id="JoiningGroup.Straight_Waw"}

### `Straight_Waw`

```silk
Straight_Waw
```

Straight Waw.

::Anchor{id="JoiningGroup.Swash_Kaf"}

### `Swash_Kaf`

```silk
Swash_Kaf
```

Swash Kaf.

::Anchor{id="JoiningGroup.Syriac_Waw"}

### `Syriac_Waw`

```silk
Syriac_Waw
```

Syriac Waw.

::Anchor{id="JoiningGroup.Tah"}

### `Tah`

```silk
Tah
```

Tah.

::Anchor{id="JoiningGroup.Taw"}

### `Taw`

```silk
Taw
```

Taw.

::Anchor{id="JoiningGroup.Teh_Marbuta"}

### `Teh_Marbuta`

```silk
Teh_Marbuta
```

Teh Marbuta.

::Anchor{id="JoiningGroup.Teh_Marbuta_Goal"}

### `Teh_Marbuta_Goal`

```silk
Teh_Marbuta_Goal
```

Teh Marbuta Goal (also `Hamza_On_Heh_Goal`).

::Anchor{id="JoiningGroup.Teth"}

### `Teth`

```silk
Teth
```

Teth.

::Anchor{id="JoiningGroup.Thin_Noon"}

### `Thin_Noon`

```silk
Thin_Noon
```

Thin Noon.

::Anchor{id="JoiningGroup.Thin_Yeh"}

### `Thin_Yeh`

```silk
Thin_Yeh
```

Thin Yeh.

::Anchor{id="JoiningGroup.Vertical_Tail"}

### `Vertical_Tail`

```silk
Vertical_Tail
```

Vertical Tail.

::Anchor{id="JoiningGroup.Waw"}

### `Waw`

```silk
Waw
```

Waw.

::Anchor{id="JoiningGroup.Yeh"}

### `Yeh`

```silk
Yeh
```

Yeh.

::Anchor{id="JoiningGroup.Yeh_Barree"}

### `Yeh_Barree`

```silk
Yeh_Barree
```

Yeh Barree.

::Anchor{id="JoiningGroup.Yeh_With_Tail"}

### `Yeh_With_Tail`

```silk
Yeh_With_Tail
```

Yeh With Tail.

::Anchor{id="JoiningGroup.Yudh"}

### `Yudh`

```silk
Yudh
```

Yudh.

::Anchor{id="JoiningGroup.Yudh_He"}

### `Yudh_He`

```silk
Yudh_He
```

Yudh He.

::Anchor{id="JoiningGroup.Zain"}

### `Zain`

```silk
Zain
```

Zain.

::Anchor{id="JoiningGroup.Zhain"}

### `Zhain`

```silk
Zhain
```

Zhain.

::Anchor{id="JoiningGroup.impl"}

## Implementation `JoiningGroup`

```silk
impl JoiningGroup
```

::Anchor{id="JoiningGroup.impl.of"}

### Associated function `of`

```silk
pub fn of(cp: u32) -> JoiningGroup
```

Returns the `Joining_Group` of the code point `cp`. A value past U+10FFFF gets
`No_Joining_Group`.

::Anchor{id="JoiningGroup.impl.fromTableValue"}

### Associated function `fromTableValue`

```silk
pub fn fromTableValue(value: u32) -> JoiningGroup
```

Returns the value for the packed number `value` from `unicode_data.joiningGroup`. An unknown
number gives `No_Joining_Group`.

::Anchor{id="LineBreak"}

## `LineBreak`

```silk
pub enum LineBreak
```

The Unicode `Line_Break` property: the line breaking class of a character, which the Unicode
Line Breaking Algorithm (UAX #14) reads.

### Details
[`LineBreak.of`](#LineBreak.impl.of) reads the value of one code point. A code point with no explicit value, or a
value past U+10FFFF, gets the Unicode default, `XX`.

::Anchor{id="LineBreak.AI"}

### `AI`

```silk
AI
```

Ambiguous.

::Anchor{id="LineBreak.AK"}

### `AK`

```silk
AK
```

Aksara.

::Anchor{id="LineBreak.AL"}

### `AL`

```silk
AL
```

Alphabetic.

::Anchor{id="LineBreak.AP"}

### `AP`

```silk
AP
```

Aksara Prebase.

::Anchor{id="LineBreak.AS"}

### `AS`

```silk
AS
```

Aksara Start.

::Anchor{id="LineBreak.B2"}

### `B2`

```silk
B2
```

Break Both.

::Anchor{id="LineBreak.BA"}

### `BA`

```silk
BA
```

Break After.

::Anchor{id="LineBreak.BB"}

### `BB`

```silk
BB
```

Break Before.

::Anchor{id="LineBreak.BK"}

### `BK`

```silk
BK
```

Mandatory Break.

::Anchor{id="LineBreak.CB"}

### `CB`

```silk
CB
```

Contingent Break.

::Anchor{id="LineBreak.CJ"}

### `CJ`

```silk
CJ
```

Conditional Japanese Starter.

::Anchor{id="LineBreak.CL"}

### `CL`

```silk
CL
```

Close Punctuation.

::Anchor{id="LineBreak.CM"}

### `CM`

```silk
CM
```

Combining Mark.

::Anchor{id="LineBreak.CP"}

### `CP`

```silk
CP
```

Close Parenthesis.

::Anchor{id="LineBreak.CR"}

### `CR`

```silk
CR
```

Carriage Return.

::Anchor{id="LineBreak.EB"}

### `EB`

```silk
EB
```

E Base.

::Anchor{id="LineBreak.EM"}

### `EM`

```silk
EM
```

E Modifier.

::Anchor{id="LineBreak.EX"}

### `EX`

```silk
EX
```

Exclamation.

::Anchor{id="LineBreak.GL"}

### `GL`

```silk
GL
```

Glue.

::Anchor{id="LineBreak.H2"}

### `H2`

```silk
H2
```

H2.

::Anchor{id="LineBreak.H3"}

### `H3`

```silk
H3
```

H3.

::Anchor{id="LineBreak.HH"}

### `HH`

```silk
HH
```

Unambiguous Hyphen.

::Anchor{id="LineBreak.HL"}

### `HL`

```silk
HL
```

Hebrew Letter.

::Anchor{id="LineBreak.HY"}

### `HY`

```silk
HY
```

Hyphen.

::Anchor{id="LineBreak.ID"}

### `ID`

```silk
ID
```

Ideographic.

::Anchor{id="LineBreak.IN"}

### `IN`

```silk
IN
```

Inseparable (also `Inseperable`).

::Anchor{id="LineBreak.IS"}

### `IS`

```silk
IS
```

Infix Numeric.

::Anchor{id="LineBreak.JL"}

### `JL`

```silk
JL
```

JL.

::Anchor{id="LineBreak.JT"}

### `JT`

```silk
JT
```

JT.

::Anchor{id="LineBreak.JV"}

### `JV`

```silk
JV
```

JV.

::Anchor{id="LineBreak.LF"}

### `LF`

```silk
LF
```

Line Feed.

::Anchor{id="LineBreak.NL"}

### `NL`

```silk
NL
```

Next Line.

::Anchor{id="LineBreak.NS"}

### `NS`

```silk
NS
```

Nonstarter.

::Anchor{id="LineBreak.NU"}

### `NU`

```silk
NU
```

Numeric.

::Anchor{id="LineBreak.OP"}

### `OP`

```silk
OP
```

Open Punctuation.

::Anchor{id="LineBreak.PO"}

### `PO`

```silk
PO
```

Postfix Numeric.

::Anchor{id="LineBreak.PR"}

### `PR`

```silk
PR
```

Prefix Numeric.

::Anchor{id="LineBreak.QU"}

### `QU`

```silk
QU
```

Quotation.

::Anchor{id="LineBreak.RI"}

### `RI`

```silk
RI
```

Regional Indicator.

::Anchor{id="LineBreak.SA"}

### `SA`

```silk
SA
```

Complex Context.

::Anchor{id="LineBreak.SG"}

### `SG`

```silk
SG
```

Surrogate.

::Anchor{id="LineBreak.SP"}

### `SP`

```silk
SP
```

Space.

::Anchor{id="LineBreak.SY"}

### `SY`

```silk
SY
```

Break Symbols.

::Anchor{id="LineBreak.VF"}

### `VF`

```silk
VF
```

Virama Final.

::Anchor{id="LineBreak.VI"}

### `VI`

```silk
VI
```

Virama.

::Anchor{id="LineBreak.WJ"}

### `WJ`

```silk
WJ
```

Word Joiner.

::Anchor{id="LineBreak.XX"}

### `XX`

```silk
XX
```

Unknown.

::Anchor{id="LineBreak.ZW"}

### `ZW`

```silk
ZW
```

ZWSpace.

::Anchor{id="LineBreak.ZWJ"}

### `ZWJ`

```silk
ZWJ
```

ZWJ.

::Anchor{id="LineBreak.impl"}

## Implementation `LineBreak`

```silk
impl LineBreak
```

::Anchor{id="LineBreak.impl.of"}

### Associated function `of`

```silk
pub fn of(cp: u32) -> LineBreak
```

Returns the `Line_Break` of the code point `cp`. A value past U+10FFFF gets `XX`.

::Anchor{id="LineBreak.impl.fromTableValue"}

### Associated function `fromTableValue`

```silk
pub fn fromTableValue(value: u32) -> LineBreak
```

Returns the value for the packed number `value` from `unicode_data.lineBreak`. An unknown
number gives `XX`.

::Anchor{id="LineBreak.impl.tableIndex"}

### Method `tableIndex`

```silk
pub fn tableIndex(self: Self) -> usize
```

Returns the row and column of the class in `unicode_data.linePairs`.

::Anchor{id="EastAsianWidth"}

## `EastAsianWidth`

```silk
pub enum EastAsianWidth
```

The Unicode `East_Asian_Width` property: the width of a character in East Asian typography (UAX
#11).

### Details
[`EastAsianWidth.of`](#EastAsianWidth.impl.of) reads the value of one code point. A code point with no explicit value, or
a value past U+10FFFF, gets the Unicode default, `N`.

::Anchor{id="EastAsianWidth.A"}

### `A`

```silk
A
```

Ambiguous.

::Anchor{id="EastAsianWidth.F"}

### `F`

```silk
F
```

Fullwidth.

::Anchor{id="EastAsianWidth.H"}

### `H`

```silk
H
```

Halfwidth.

::Anchor{id="EastAsianWidth.N"}

### `N`

```silk
N
```

Neutral.

::Anchor{id="EastAsianWidth.Na"}

### `Na`

```silk
Na
```

Narrow.

::Anchor{id="EastAsianWidth.W"}

### `W`

```silk
W
```

Wide.

::Anchor{id="EastAsianWidth.impl"}

## Implementation `EastAsianWidth`

```silk
impl EastAsianWidth
```

::Anchor{id="EastAsianWidth.impl.of"}

### Associated function `of`

```silk
pub fn of(cp: u32) -> EastAsianWidth
```

Returns the `East_Asian_Width` of the code point `cp`. A value past U+10FFFF gets `N`.

::Anchor{id="EastAsianWidth.impl.fromTableValue"}

### Associated function `fromTableValue`

```silk
pub fn fromTableValue(value: u32) -> EastAsianWidth
```

Returns the value for the packed number `value` from `unicode_data.eastAsianWidth`. An unknown
number gives `N`.

::Anchor{id="GraphemeBreak"}

## `GraphemeBreak`

```silk
pub enum GraphemeBreak
```

The Unicode `Grapheme_Cluster_Break` property: the class of a character for grapheme cluster
segmentation (UAX #29).

### Details
[`GraphemeBreak.of`](#GraphemeBreak.impl.of) reads the value of one code point. A code point with no explicit value, or
a value past U+10FFFF, gets the Unicode default, `Other`.

::Anchor{id="GraphemeBreak.Control"}

### `Control`

```silk
Control
```

Control (also `CN`).

::Anchor{id="GraphemeBreak.CR"}

### `CR`

```silk
CR
```

CR.

::Anchor{id="GraphemeBreak.E_Base"}

### `E_Base`

```silk
E_Base
```

E Base (also `EB`).

::Anchor{id="GraphemeBreak.E_Base_GAZ"}

### `E_Base_GAZ`

```silk
E_Base_GAZ
```

E Base GAZ (also `EBG`).

::Anchor{id="GraphemeBreak.E_Modifier"}

### `E_Modifier`

```silk
E_Modifier
```

E Modifier (also `EM`).

::Anchor{id="GraphemeBreak.Extend"}

### `Extend`

```silk
Extend
```

Extend (also `EX`).

::Anchor{id="GraphemeBreak.Glue_After_Zwj"}

### `Glue_After_Zwj`

```silk
Glue_After_Zwj
```

Glue After Zwj (also `GAZ`).

::Anchor{id="GraphemeBreak.L"}

### `L`

```silk
L
```

L.

::Anchor{id="GraphemeBreak.LF"}

### `LF`

```silk
LF
```

LF.

::Anchor{id="GraphemeBreak.LV"}

### `LV`

```silk
LV
```

LV.

::Anchor{id="GraphemeBreak.LVT"}

### `LVT`

```silk
LVT
```

LVT.

::Anchor{id="GraphemeBreak.Prepend"}

### `Prepend`

```silk
Prepend
```

Prepend (also `PP`).

::Anchor{id="GraphemeBreak.Regional_Indicator"}

### `Regional_Indicator`

```silk
Regional_Indicator
```

Regional Indicator (also `RI`).

::Anchor{id="GraphemeBreak.SpacingMark"}

### `SpacingMark`

```silk
SpacingMark
```

SpacingMark (also `SM`).

::Anchor{id="GraphemeBreak.T"}

### `T`

```silk
T
```

T.

::Anchor{id="GraphemeBreak.V"}

### `V`

```silk
V
```

V.

::Anchor{id="GraphemeBreak.Other"}

### `Other`

```silk
Other
```

Other (also `XX`).

::Anchor{id="GraphemeBreak.ZWJ"}

### `ZWJ`

```silk
ZWJ
```

ZWJ.

::Anchor{id="GraphemeBreak.impl"}

## Implementation `GraphemeBreak`

```silk
impl GraphemeBreak
```

::Anchor{id="GraphemeBreak.impl.of"}

### Associated function `of`

```silk
pub fn of(cp: u32) -> GraphemeBreak
```

Returns the `Grapheme_Cluster_Break` of the code point `cp`. A value past U+10FFFF gets
`Other`.

::Anchor{id="GraphemeBreak.impl.fromTableValue"}

### Associated function `fromTableValue`

```silk
pub fn fromTableValue(value: u32) -> GraphemeBreak
```

Returns the value for the packed number `value` from `unicode_data.graphemeBreak`. An unknown
number gives `Other`.

::Anchor{id="WordBreak"}

## `WordBreak`

```silk
pub enum WordBreak
```

The Unicode `Word_Break` property: the class of a character for word segmentation (UAX #29).

### Details
[`WordBreak.of`](#WordBreak.impl.of) reads the value of one code point. A code point with no explicit value, or a
value past U+10FFFF, gets the Unicode default, `Other`.

::Anchor{id="WordBreak.CR"}

### `CR`

```silk
CR
```

CR.

::Anchor{id="WordBreak.Double_Quote"}

### `Double_Quote`

```silk
Double_Quote
```

Double Quote (also `DQ`).

::Anchor{id="WordBreak.E_Base"}

### `E_Base`

```silk
E_Base
```

E Base (also `EB`).

::Anchor{id="WordBreak.E_Base_GAZ"}

### `E_Base_GAZ`

```silk
E_Base_GAZ
```

E Base GAZ (also `EBG`).

::Anchor{id="WordBreak.E_Modifier"}

### `E_Modifier`

```silk
E_Modifier
```

E Modifier (also `EM`).

::Anchor{id="WordBreak.ExtendNumLet"}

### `ExtendNumLet`

```silk
ExtendNumLet
```

ExtendNumLet (also `EX`).

::Anchor{id="WordBreak.Extend"}

### `Extend`

```silk
Extend
```

Extend.

::Anchor{id="WordBreak.Format"}

### `Format`

```silk
Format
```

Format (also `FO`).

::Anchor{id="WordBreak.Glue_After_Zwj"}

### `Glue_After_Zwj`

```silk
Glue_After_Zwj
```

Glue After Zwj (also `GAZ`).

::Anchor{id="WordBreak.Hebrew_Letter"}

### `Hebrew_Letter`

```silk
Hebrew_Letter
```

Hebrew Letter (also `HL`).

::Anchor{id="WordBreak.Katakana"}

### `Katakana`

```silk
Katakana
```

Katakana (also `KA`).

::Anchor{id="WordBreak.ALetter"}

### `ALetter`

```silk
ALetter
```

ALetter (also `LE`).

::Anchor{id="WordBreak.LF"}

### `LF`

```silk
LF
```

LF.

::Anchor{id="WordBreak.MidNumLet"}

### `MidNumLet`

```silk
MidNumLet
```

MidNumLet (also `MB`).

::Anchor{id="WordBreak.MidLetter"}

### `MidLetter`

```silk
MidLetter
```

MidLetter (also `ML`).

::Anchor{id="WordBreak.MidNum"}

### `MidNum`

```silk
MidNum
```

MidNum (also `MN`).

::Anchor{id="WordBreak.Newline"}

### `Newline`

```silk
Newline
```

Newline (also `NL`).

::Anchor{id="WordBreak.Numeric"}

### `Numeric`

```silk
Numeric
```

Numeric (also `NU`).

::Anchor{id="WordBreak.Regional_Indicator"}

### `Regional_Indicator`

```silk
Regional_Indicator
```

Regional Indicator (also `RI`).

::Anchor{id="WordBreak.Single_Quote"}

### `Single_Quote`

```silk
Single_Quote
```

Single Quote (also `SQ`).

::Anchor{id="WordBreak.WSegSpace"}

### `WSegSpace`

```silk
WSegSpace
```

WSegSpace.

::Anchor{id="WordBreak.Other"}

### `Other`

```silk
Other
```

Other (also `XX`).

::Anchor{id="WordBreak.ZWJ"}

### `ZWJ`

```silk
ZWJ
```

ZWJ.

::Anchor{id="WordBreak.impl"}

## Implementation `WordBreak`

```silk
impl WordBreak
```

::Anchor{id="WordBreak.impl.of"}

### Associated function `of`

```silk
pub fn of(cp: u32) -> WordBreak
```

Returns the `Word_Break` of the code point `cp`. A value past U+10FFFF gets `Other`.

::Anchor{id="WordBreak.impl.fromTableValue"}

### Associated function `fromTableValue`

```silk
pub fn fromTableValue(value: u32) -> WordBreak
```

Returns the value for the packed number `value` from `unicode_data.wordBreak`. An unknown
number gives `Other`.

::Anchor{id="SentenceBreak"}

## `SentenceBreak`

```silk
pub enum SentenceBreak
```

The Unicode `Sentence_Break` property: the class of a character for sentence segmentation (UAX
#29).

### Details
[`SentenceBreak.of`](#SentenceBreak.impl.of) reads the value of one code point. A code point with no explicit value, or
a value past U+10FFFF, gets the Unicode default, `Other`.

::Anchor{id="SentenceBreak.ATerm"}

### `ATerm`

```silk
ATerm
```

ATerm (also `AT`).

::Anchor{id="SentenceBreak.Close"}

### `Close`

```silk
Close
```

Close (also `CL`).

::Anchor{id="SentenceBreak.CR"}

### `CR`

```silk
CR
```

CR.

::Anchor{id="SentenceBreak.Extend"}

### `Extend`

```silk
Extend
```

Extend (also `EX`).

::Anchor{id="SentenceBreak.Format"}

### `Format`

```silk
Format
```

Format (also `FO`).

::Anchor{id="SentenceBreak.OLetter"}

### `OLetter`

```silk
OLetter
```

OLetter (also `LE`).

::Anchor{id="SentenceBreak.LF"}

### `LF`

```silk
LF
```

LF.

::Anchor{id="SentenceBreak.Lower"}

### `Lower`

```silk
Lower
```

Lower (also `LO`).

::Anchor{id="SentenceBreak.Numeric"}

### `Numeric`

```silk
Numeric
```

Numeric (also `NU`).

::Anchor{id="SentenceBreak.SContinue"}

### `SContinue`

```silk
SContinue
```

SContinue (also `SC`).

::Anchor{id="SentenceBreak.Sep"}

### `Sep`

```silk
Sep
```

Sep (also `SE`).

::Anchor{id="SentenceBreak.Sp"}

### `Sp`

```silk
Sp
```

Sp (also `SP`).

::Anchor{id="SentenceBreak.STerm"}

### `STerm`

```silk
STerm
```

STerm (also `ST`).

::Anchor{id="SentenceBreak.Upper"}

### `Upper`

```silk
Upper
```

Upper (also `UP`).

::Anchor{id="SentenceBreak.Other"}

### `Other`

```silk
Other
```

Other (also `XX`).

::Anchor{id="SentenceBreak.impl"}

## Implementation `SentenceBreak`

```silk
impl SentenceBreak
```

::Anchor{id="SentenceBreak.impl.of"}

### Associated function `of`

```silk
pub fn of(cp: u32) -> SentenceBreak
```

Returns the `Sentence_Break` of the code point `cp`. A value past U+10FFFF gets `Other`.

::Anchor{id="SentenceBreak.impl.fromTableValue"}

### Associated function `fromTableValue`

```silk
pub fn fromTableValue(value: u32) -> SentenceBreak
```

Returns the value for the packed number `value` from `unicode_data.sentenceBreak`. An unknown
number gives `Other`.

::Anchor{id="VerticalOrientation"}

## `VerticalOrientation`

```silk
pub enum VerticalOrientation
```

The Unicode `Vertical_Orientation` property: the default orientation of a character in vertical
text (UAX #50).

### Details
[`VerticalOrientation.of`](#VerticalOrientation.impl.of) reads the value of one code point. A code point with no explicit
value, or a value past U+10FFFF, gets the Unicode default, `R`.

::Anchor{id="VerticalOrientation.R"}

### `R`

```silk
R
```

Rotated.

::Anchor{id="VerticalOrientation.Tr"}

### `Tr`

```silk
Tr
```

Transformed Rotated.

::Anchor{id="VerticalOrientation.Tu"}

### `Tu`

```silk
Tu
```

Transformed Upright.

::Anchor{id="VerticalOrientation.U"}

### `U`

```silk
U
```

Upright.

::Anchor{id="VerticalOrientation.impl"}

## Implementation `VerticalOrientation`

```silk
impl VerticalOrientation
```

::Anchor{id="VerticalOrientation.impl.of"}

### Associated function `of`

```silk
pub fn of(cp: u32) -> VerticalOrientation
```

Returns the `Vertical_Orientation` of the code point `cp`. A value past U+10FFFF gets `R`.

::Anchor{id="VerticalOrientation.impl.fromTableValue"}

### Associated function `fromTableValue`

```silk
pub fn fromTableValue(value: u32) -> VerticalOrientation
```

Returns the value for the packed number `value` from `unicode_data.verticalOrientation`. An
unknown number gives `R`.

::Anchor{id="IndicConjunctBreak"}

## `IndicConjunctBreak`

```silk
pub enum IndicConjunctBreak
```

The Unicode `Indic_Conjunct_Break` property: the role of a character in an Indic conjunct for
grapheme cluster segmentation (UAX #29).

### Details
[`IndicConjunctBreak.of`](#IndicConjunctBreak.impl.of) reads the value of one code point. A code point with no explicit
value, or a value past U+10FFFF, gets the Unicode default, `None`.

::Anchor{id="IndicConjunctBreak.None"}

### `None`

```silk
None
```

None.

::Anchor{id="IndicConjunctBreak.Consonant"}

### `Consonant`

```silk
Consonant
```

Consonant.

::Anchor{id="IndicConjunctBreak.Extend"}

### `Extend`

```silk
Extend
```

Extend.

::Anchor{id="IndicConjunctBreak.Linker"}

### `Linker`

```silk
Linker
```

Linker.

::Anchor{id="IndicConjunctBreak.impl"}

## Implementation `IndicConjunctBreak`

```silk
impl IndicConjunctBreak
```

::Anchor{id="IndicConjunctBreak.impl.of"}

### Associated function `of`

```silk
pub fn of(cp: u32) -> IndicConjunctBreak
```

Returns the `Indic_Conjunct_Break` of the code point `cp`. A value past U+10FFFF gets `None`.

::Anchor{id="IndicConjunctBreak.impl.fromTableValue"}

### Associated function `fromTableValue`

```silk
pub fn fromTableValue(value: u32) -> IndicConjunctBreak
```

Returns the value for the packed number `value` from `unicode_data.indicConjunctBreak`. An
unknown number gives `None`.

::Anchor{id="BidiPairedBracketType"}

## `BidiPairedBracketType`

```silk
pub enum BidiPairedBracketType
```

The Unicode `Bidi_Paired_Bracket_Type` property: whether a character is an opening or a closing
paired bracket for the Unicode Bidirectional Algorithm.

### Details
[`BidiPairedBracketType.of`](#BidiPairedBracketType.impl.of) reads the value of one code point. A code point with no explicit
value, or a value past U+10FFFF, gets the Unicode default, `None`.

::Anchor{id="BidiPairedBracketType.None"}

### `None`

```silk
None
```

None (also `n`).

::Anchor{id="BidiPairedBracketType.Open"}

### `Open`

```silk
Open
```

Open (also `o`).

::Anchor{id="BidiPairedBracketType.Close"}

### `Close`

```silk
Close
```

Close (also `c`).

::Anchor{id="BidiPairedBracketType.impl"}

## Implementation `BidiPairedBracketType`

```silk
impl BidiPairedBracketType
```

::Anchor{id="BidiPairedBracketType.impl.of"}

### Associated function `of`

```silk
pub fn of(cp: u32) -> BidiPairedBracketType
```

Returns the `Bidi_Paired_Bracket_Type` of the code point `cp`. A value past U+10FFFF gets
`None`.

::Anchor{id="BidiPairedBracketType.impl.fromTableValue"}

### Associated function `fromTableValue`

```silk
pub fn fromTableValue(value: u32) -> BidiPairedBracketType
```

Returns the value for the packed number `value` from `unicode_data.bidiPairedBracketType`. An
unknown number gives `None`.

Profiles: `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu-no-libc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-gnu-no-libc`, `wasm32-unknown-unknown`, `wasm32-wasip1`, `wasm32-wasip2`, `x86_64-pc-windows-msvc`, `wasm64-unknown-unknown`.
