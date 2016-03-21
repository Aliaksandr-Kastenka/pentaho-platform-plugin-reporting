/*!
 * This program is free software; you can redistribute it and/or modify it under the
 * terms of the GNU Lesser General Public License, version 2.1 as published by the Free Software
 * Foundation.
 *
 * You should have received a copy of the GNU Lesser General Public License along with this
 * program; if not, you can obtain a copy at http://www.gnu.org/licenses/old-licenses/lgpl-2.1.html
 * or from the Free Software Foundation, Inc.,
 * 51 Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA.
 *
 * This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY;
 * without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU Lesser General Public License for more details.
 *
 * Copyright (c) 2016 Pentaho Corporation..  All rights reserved.
 */

define(["reportviewer/reportviewer", "reportviewer/reportviewer-logging", "reportviewer/reportviewer-prompt", "common-ui/jquery-clean",
    "text!./parameterDefinition.xml!strip", "dojo/dom-class", 'common-ui/util/util', "./utils/registryMock"
  ],
  function(ReportViewer, Logging, Prompt, $, parameterDefinition, domClass, util, registryMock) {

    describe("Report Viewer", function() {
      var reportViewer;

      beforeAll(function() {
        var mockGlassPane = jasmine.createSpyObj("glassPane", ["show", "hide"]);
        mockGlassPane.id = "glassPane";
        registryMock.mock(mockGlassPane);
      });

      afterAll(function() {
        registryMock.unMock("glassPane");
      });

      beforeEach(function() {
        window._isTopReportViewer = true;
        window.inSchedulerDialog = false;
        window.inMobile = true;
        var options = {
          parent: window.parent.logger
        };
        window.logged = Logging.create(window.name, options);

        var reportPrompt = new Prompt();

        spyOn($, 'ajax').and.callFake(function(params) {
          params.success(parameterDefinition);
        });

        spyOn(domClass, 'add');
        spyOn(domClass, 'remove');

        reportPrompt.createPromptPanel();
        reportViewer = new ReportViewer(reportPrompt);
      });

      describe("state properties", function() {
        beforeEach(function() {
          window.inSchedulerDialog = true;
          spyOn(reportViewer.reportPrompt, '_getStateProperty').and.callThrough();
        });

        it("should get the promtpNeeded value", function() {
          expect(reportViewer.reportPrompt._getStateProperty('promptNeeded')).toBeFalsy();

          // Force new value for promptNeeded on the parameter definition
          reportViewer.reportPrompt.panel.paramDefn.promptNeeded = true;
          expect(reportViewer.reportPrompt._getStateProperty('promptNeeded')).toBeTruthy();
        });

        it("should get promtpNeeded on updateLayout", function() {
          spyOn(reportViewer.view, '_initLayout');
          spyOn(reportViewer.view, '_showReportContent');
          spyOn(reportViewer.view, '_hasReportContent').and.returnValue(true);

          reportViewer.view.updateLayout();
          expect(reportViewer.reportPrompt._getStateProperty).toHaveBeenCalledWith('promptNeeded');
        });

        it("should get promtpNeeded on promptReady", function() {
          window.parameterValidityCallback = function() {};

          spyOn(reportViewer.view, 'showPromptPanel');

          reportViewer.view.promptReady(function() {});
          expect(reportViewer.reportPrompt._getStateProperty).toHaveBeenCalledWith('promptNeeded');
        });

        it("should get promtpNeeded on initLayout", function() {
          spyOn(reportViewer.view, 'updatePageControl');
          spyOn(reportViewer.view, 'showPromptPanel');

          reportViewer.view._initLayout();
          expect(reportViewer.reportPrompt._getStateProperty).toHaveBeenCalledWith('promptNeeded');
        });

        it("should get promtpNeeded on submitReport", function() {
          window.inSchedulerDialog = false;
          spyOn(reportViewer.view, '_initLayout');
          spyOn(reportViewer, '_updateReportContent');

          reportViewer.submitReport();
          expect(reportViewer.reportPrompt._getStateProperty).toHaveBeenCalledWith('promptNeeded');
        });

        it("should get autoSubmit on _updateReportContent", function() {
          spyOn(reportViewer.reportPrompt.panel, 'refresh');
          spyOn(reportViewer, '_updateReportContentCore');

          reportViewer._updateReportContent();
          expect(reportViewer.reportPrompt._getStateProperty).toHaveBeenCalledWith('autoSubmit');
        });

        it("should get showParameterUI on initLayout", function() {
          spyOn(reportViewer.view, 'updatePageControl');
          spyOn(reportViewer.view, 'showPromptPanel');

          reportViewer.view._initLayout();
          expect(reportViewer.reportPrompt._getStateProperty).toHaveBeenCalledWith('showParameterUI');
        });

        it("should get showParameterUI on updateLayout", function() {
          spyOn(reportViewer.view, '_initLayout');
          spyOn(reportViewer.view, '_showReportContent');
          spyOn(reportViewer.view, '_hasReportContent').and.returnValue(true);

          reportViewer.view.updateLayout(function() {});
          expect(reportViewer.reportPrompt._getStateProperty).toHaveBeenCalledWith('showParameterUI');
        });

        it("should hide prompt when showParameterUI is false", function() {
          spyOn(reportViewer.view, '_initLayout');
          spyOn(reportViewer.view, '_showReportContent');
          spyOn(reportViewer.view, '_hasReportContent').and.returnValue(true);
          spyOn(reportViewer.view, '_hideToolbarPromptControls');
          spyOn(reportViewer.reportPrompt.panel.paramDefn, 'showParameterUI').and.returnValue(false);

          reportViewer.view.updateLayout(function() {});
          expect(reportViewer.view._hideToolbarPromptControls).toHaveBeenCalled();
        });

        it("should call allowAutoSubmit on initLayout", function() {
          spyOn(reportViewer.view, 'updatePageControl');
          spyOn(reportViewer.view, 'showPromptPanel');

          reportViewer.view._initLayout();
          expect(reportViewer.reportPrompt._getStateProperty).toHaveBeenCalledWith('allowAutoSubmit');
        });

        it("should return the correct value for allowAutoSubmit on _isAutoSubmitAllowed", function() {
          expect(reportViewer.view._isAutoSubmitAllowed()).toBeFalsy();
          reportViewer.reportPrompt.panel.paramDefn.allowAutoSubmit = function() { return true; };
          expect(reportViewer.view._isAutoSubmitAllowed()).toBeTruthy();
        });
      });

      describe("page controllers", function() {

        describe("set using accepted-page", function() {
          beforeEach(function() {
            spyOn(reportViewer.reportPrompt.api.operation, "setParameterValue").and.callThrough();
          });

          it("was called correctly", function() {
            reportViewer.view._setAcceptedPage("2");
            expect(reportViewer.reportPrompt.api.operation.setParameterValue).toHaveBeenCalledWith("accepted-page", "2");
          });

          it("was called correctly on pageChanged", function() {
            spyOn(reportViewer.reportPrompt.api.operation, "submit");
            spyOn(reportViewer.view, "pageChanged").and.callThrough();
            reportViewer.view.pageChanged("20");
            expect(reportViewer.reportPrompt.api.operation.setParameterValue).toHaveBeenCalledWith("accepted-page", "19");
            expect(reportViewer.reportPrompt.api.operation.submit).toHaveBeenCalled();
          });

          describe("was called correctly on updatePageControl with paginate as", function() {
            beforeEach(function() {
              var pageControlMock = jasmine.createSpyObj("pageControl", ["registerPageNumberChangeCallback", "setPageCount", "setPageNumber"]);
              pageControlMock.id = "pageControl";
              registryMock.mock(pageControlMock);
              spyOn(reportViewer.view, "_setAcceptedPage").and.callThrough();
              spyOn(reportViewer.reportPrompt, '_getStateProperty').and.callThrough();
            });

            afterEach(function() {
              registryMock.unMock("pageControl");
            });

            it("false", function() {
              reportViewer.reportPrompt.panel.paramDefn.paginate = false;
              reportViewer.view.updatePageControl();
              expect(reportViewer.view._setAcceptedPage).toHaveBeenCalledWith("-1");
              expect(reportViewer.reportPrompt._getStateProperty).toHaveBeenCalledWith('paginate');
              expect(reportViewer.reportPrompt._getStateProperty).not.toHaveBeenCalledWith('page');
              expect(reportViewer.reportPrompt._getStateProperty).not.toHaveBeenCalledWith('totalPages');
              expect(reportViewer.reportPrompt.api.operation.setParameterValue).toHaveBeenCalledWith("accepted-page", "-1");
            });

            it("true", function() {
              reportViewer.reportPrompt.panel.paramDefn.paginate = true;
              reportViewer.reportPrompt.panel.paramDefn.page = 5;
              reportViewer.reportPrompt.panel.paramDefn.totalPages = 8;
              reportViewer.view.updatePageControl();
              expect(reportViewer.view._setAcceptedPage).toHaveBeenCalledWith("5");
              expect(reportViewer.reportPrompt._getStateProperty).toHaveBeenCalledWith('paginate');
              expect(reportViewer.reportPrompt._getStateProperty).toHaveBeenCalledWith('page');
              expect(reportViewer.reportPrompt._getStateProperty).toHaveBeenCalledWith('totalPages');
              expect(reportViewer.reportPrompt.api.operation.setParameterValue).toHaveBeenCalledWith("accepted-page", "5");
            });
          });
        });

        describe("on _initLayout handle paginate", function() {
          beforeEach(function() {
            spyOn(reportViewer.view, "updatePageControl");
            spyOn(reportViewer.view, "showPromptPanel");
            spyOn(reportViewer.reportPrompt, '_getStateProperty').and.callThrough();
            spyOn(reportViewer.reportPrompt.api.operation, "state").and.callThrough();
          });

          it("correctly", function() {
            reportViewer._layoutInited = false;
            reportViewer.view._initLayout();
            expect(reportViewer.reportPrompt._getStateProperty).toHaveBeenCalledWith('paginate');
          })
        });
      });

      describe("_buildReportContentOptions", function() {
        it("should call the _buildReportContentOptions on the report viewer prompt", function() {
          var options = {
            "option1": "option1",
            'action': 'testAction'
          };
          spyOn(reportViewer.reportPrompt, "_buildReportContentOptions").and.returnValue(options);

          var result = reportViewer._buildReportContentOptions();

          expect(reportViewer.reportPrompt._buildReportContentOptions).toHaveBeenCalledWith('REPORT');
          expect(result).toBe(options);
          expect(result['name']).toBe(options['action']);
        });
      });

      describe("[EVENTS] checking subscription on prompt events", function() {
        it("should check subscription on prompt events", function(done) {
          spyOn(reportViewer.view, "updateLayout");
          spyOn(reportViewer, "submitReport");
          spyOn(reportViewer.view, "promptReady");
          reportViewer._bindPromptEvents();
          reportViewer.reportPrompt.api.operation.refreshPrompt();
          done();

          expect(reportViewer.view.updateLayout).toHaveBeenCalled();
          expect(reportViewer.submitReport).toHaveBeenCalledWith(true);
          expect(reportViewer.view.promptReady).toHaveBeenCalled();
        });
      });

      describe("updateLayout", function() {
        beforeEach(function() {
          spyOn(reportViewer.view, "_hideToolbarPromptControls");
          spyOn(reportViewer.view, "_showReportContent");
          spyOn(reportViewer.view, "_initLayout");
        });

        it("should hide toolbar prompts control and should show report content", function() {
          spyOn(reportViewer.reportPrompt.panel.paramDefn, "showParameterUI").and.returnValue(false);
          spyOn(reportViewer.view, "_calcReportContentVisibility").and.returnValue(false);

          reportViewer.view.updateLayout();

          expect(reportViewer.view._hideToolbarPromptControls).toHaveBeenCalled();
          expect(reportViewer.view._showReportContent).toHaveBeenCalledWith(false);
          expect(reportViewer.view._initLayout).toHaveBeenCalled();
        });

        it("should not hide toolbar prompts control and should not show report content", function() {
          spyOn(reportViewer.reportPrompt.panel.paramDefn, "showParameterUI").and.returnValue(true);
          spyOn(reportViewer.view, "_calcReportContentVisibility").and.returnValue(true);

          reportViewer.view.updateLayout();

          expect(reportViewer.view._hideToolbarPromptControls).not.toHaveBeenCalled();
          expect(reportViewer.view._showReportContent).not.toHaveBeenCalled();
          expect(reportViewer.view._initLayout).toHaveBeenCalled();
        });
      });

      describe("submitReport", function() {
        beforeEach(function() {
          spyOn(reportViewer, "_submitReportEnded");
          spyOn(reportViewer.view, "_initLayout");
          spyOn(reportViewer, "_updateReportContent");
          spyOn(reportViewer.view, "_showReportContent");
        });

        afterEach(function() {
          window.inSchedulerDialog = false;
        });

        it("should not update report content for scheduler dialog", function() {
          window.inSchedulerDialog = true;
          reportViewer.submitReport({
            isInit: true
          });

          expect(reportViewer._submitReportEnded).toHaveBeenCalled();
          expect(reportViewer.view._initLayout).not.toHaveBeenCalled();
          expect(reportViewer._updateReportContent).not.toHaveBeenCalled();
          expect(reportViewer.view._showReportContent).not.toHaveBeenCalled();
        });

        it("should not update report content if needed prompt", function() {
          //spy for 'promptNeeded' property
          spyOn(reportViewer.reportPrompt, "_getStateProperty").and.returnValue(true);

          reportViewer.submitReport({
            isInit: true
          });

          expect(reportViewer._submitReportEnded).toHaveBeenCalled();
          expect(reportViewer.view._initLayout).toHaveBeenCalled();
          expect(reportViewer._updateReportContent).not.toHaveBeenCalled();
          expect(reportViewer.view._showReportContent).toHaveBeenCalledWith(false);
        });

        it("should update report content", function() {
          //spy for 'promptNeeded' property
          spyOn(reportViewer.reportPrompt, "_getStateProperty").and.returnValue(false);

          reportViewer.submitReport({
            isInit: true
          });

          expect(reportViewer._submitReportEnded).not.toHaveBeenCalled();
          expect(reportViewer.view._initLayout).toHaveBeenCalled();
          expect(reportViewer._updateReportContent).toHaveBeenCalled();
          expect(reportViewer.view._showReportContent).not.toHaveBeenCalled();
        });
      });
    });
  });
