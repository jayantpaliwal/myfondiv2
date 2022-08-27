import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { EditGoalPage } from './edit-goal.page';

describe('EditGoalPage', () => {
  let component: EditGoalPage;
  let fixture: ComponentFixture<EditGoalPage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ EditGoalPage ],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(EditGoalPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
