import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
import { AddCategoriesPage } from './add-categories.page';




describe('AddCategoriesPage', () => {
  let component: AddCategoriesPage;
  let fixture: ComponentFixture<AddCategoriesPage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [AddCategoriesPage],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(AddCategoriesPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
