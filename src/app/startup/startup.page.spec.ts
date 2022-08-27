import { StartupPage } from './startup.page';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { async, ComponentFixture, TestBed } from '@angular/core/testing';

describe('LoginPage', () => {
  let component: StartupPage;
  let fixture: ComponentFixture<StartupPage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ StartupPage ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(StartupPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
