import { Component } from '@angular/core';
import { CategoryGridComponent } from './category-grid.component';

@Component({
  selector: 'app-home',
  imports: [CategoryGridComponent],
  template: `
    <h1>Dine Score</h1>
    <p>Find and review restaurants in Colombo, Kandy and Galle.</p>
    <app-category-grid />
  `,
})
export class HomeComponent {}
