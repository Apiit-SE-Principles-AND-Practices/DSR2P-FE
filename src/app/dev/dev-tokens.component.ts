import { Component } from '@angular/core';
import { CONTRAST_PAIRS, pairRatio } from '../core/contrast';

const SIZES = ['sm', 'body', 'lg', 'xl', '2xl'] as const;

const SAMPLES = [
  { lang: 'en', label: 'English', text: 'Delicious food, fairly reviewed' },
  { lang: 'si', label: 'සිංහල', text: 'රසවත් ආහාර, සාධාරණ සමාලෝචන' },
  { lang: 'ta', label: 'தமிழ்', text: 'சுவையான உணவு, நியாயமான மதிப்புரைகள்' },
];

/** Dev-only visual check of the design tokens (route is absent from production builds). */
@Component({
  selector: 'app-dev-tokens',
  styleUrl: './dev-tokens.component.css',
  template: `
    <h1>Design tokens</h1>

    <h2>Colour pairs (WCAG AA)</h2>
    <table>
      <thead>
        <tr>
          <th scope="col">Sample</th>
          <th scope="col">Foreground</th>
          <th scope="col">Background</th>
          <th scope="col">Ratio</th>
          <th scope="col">Result</th>
        </tr>
      </thead>
      <tbody>
        @for (pair of pairs; track pair.fg + pair.bg) {
          <tr>
            <td>
              <span
                class="sample"
                [style.color]="'var(' + pair.fg + ')'"
                [style.background]="'var(' + pair.bg + ')'"
                >Aa</span
              >
            </td>
            <td>{{ pair.fg }}</td>
            <td>{{ pair.bg }}</td>
            <td>{{ pair.ratio.toFixed(2) }}:1 (min {{ pair.min }})</td>
            <td>{{ pair.ratio >= pair.min ? 'Pass' : 'Fail' }}</td>
          </tr>
        }
      </tbody>
    </table>

    <h2>Type scale</h2>
    @for (size of sizes; track size) {
      <p [style.font-size]="'var(--font-size-' + size + ')'">
        --font-size-{{ size }}: The quick brown fox
      </p>
    }

    <h2>Scripts (font fallback)</h2>
    @for (sample of samples; track sample.lang) {
      <p [lang]="sample.lang">
        <strong>{{ sample.label }}</strong
        >: {{ sample.text }}
      </p>
    }
  `,
})
export class DevTokensComponent {
  protected readonly sizes = SIZES;
  protected readonly samples = SAMPLES;
  protected readonly pairs = CONTRAST_PAIRS.map((pair) => ({ ...pair, ratio: pairRatio(pair) }));
}
