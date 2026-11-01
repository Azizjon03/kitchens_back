<?php

namespace App\Services\Printing;

/**
 * #53: oddiy ESC/POS quruvchi (termoprinter, 58/80 mm). Matn ASCII'ga keltiriladi —
 * o'zbekcha lotin yozuvi (Go'sht, O'rtacha) printerning standart kod sahifasida chiqadi.
 */
class EscPos
{
    private string $buf = '';

    public function __construct(private int $paperWidth = 80)
    {
        $this->buf = "\x1B@"."\x1Bt\x00"; // ishga tushirish + PC437
    }

    /** Qatordagi belgilar soni (A shrift): 80 mm — 48, 58 mm — 32 */
    public function cols(int $scale = 1): int
    {
        return intdiv($this->paperWidth >= 80 ? 48 : 32, $scale);
    }

    public static function ascii(string $s): string
    {
        $s = strtr($s, [
            "\u{02BB}" => "'", "\u{02BC}" => "'", "\u{2019}" => "'", "\u{2018}" => "'", '`' => "'",
            "\u{00D7}" => 'x', "\u{2014}" => '-', "\u{2013}" => '-', "\u{2116}" => 'No', "\u{00A0}" => ' ', "\u{2026}" => '...',
            "\u{00AB}" => '"', "\u{00BB}" => '"', "\u{201C}" => '"', "\u{201D}" => '"',
        ]);
        $t = @iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $s);

        return $t === false ? preg_replace('/[^\x20-\x7E]/', '?', $s) : $t;
    }

    public function align(string $a): self
    {
        $this->buf .= "\x1Ba".chr(['left' => 0, 'center' => 1, 'right' => 2][$a] ?? 0);

        return $this;
    }

    public function bold(bool $on = true): self
    {
        $this->buf .= "\x1BE".chr($on ? 1 : 0);

        return $this;
    }

    /** 1 — oddiy, 2 — ikki baravar (eni va bo'yi) */
    public function size(int $scale): self
    {
        $n = max(1, min(8, $scale)) - 1;
        $this->buf .= "\x1D!".chr(($n << 4) | $n);

        return $this;
    }

    public function invert(bool $on = true): self
    {
        $this->buf .= "\x1DB".chr($on ? 1 : 0);

        return $this;
    }

    public function line(string $text = ''): self
    {
        $this->buf .= self::ascii($text)."\n";

        return $this;
    }

    /** Uzun matnni so'z bo'yicha qatorlarga bo'ladi */
    public function wrap(string $text, int $scale = 1, string $indent = ''): self
    {
        $width = $this->cols($scale) - strlen($indent);
        foreach (explode("\n", wordwrap(self::ascii($text), max(8, $width), "\n", true)) as $i => $l) {
            $this->buf .= ($i ? $indent : '').$l."\n";
        }

        return $this;
    }

    /** Chap va o'ng matn bitta qatorda */
    public function row(string $left, string $right, int $scale = 1): self
    {
        $left = self::ascii($left);
        $right = self::ascii($right);
        $width = $this->cols($scale);
        $space = $width - strlen($right) - 1;
        if (strlen($left) > $space) {
            $this->wrap($left, $scale);
            $left = '';
        }
        $this->buf .= str_pad($left, $width - strlen($right)).$right."\n";

        return $this;
    }

    public function rule(string $ch = '-'): self
    {
        $this->buf .= str_repeat($ch, $this->cols())."\n";

        return $this;
    }

    public function feed(int $n = 1): self
    {
        $this->buf .= "\x1Bd".chr($n);

        return $this;
    }

    /** Qog'ozni surib qisman kesish */
    public function cut(): self
    {
        $this->buf .= "\x1DV\x42\x03";

        return $this;
    }

    public function bytes(): string
    {
        return $this->buf;
    }
}
