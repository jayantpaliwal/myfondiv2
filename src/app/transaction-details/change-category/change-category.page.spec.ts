import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { ChangeCategoryPage } from './change-category.page';

describe('ChangeCategoryPage', () => {
  let component: ChangeCategoryPage;
  let fixture: ComponentFixture<ChangeCategoryPage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ChangeCategoryPage ],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(ChangeCategoryPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
