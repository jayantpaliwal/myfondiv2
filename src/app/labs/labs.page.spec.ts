import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
import { LabsPage } from './labs.page';


describe('LabsPage', () => {
  let component: LabsPage;
  let fixture: ComponentFixture<LabsPage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [LabsPage],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(LabsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
