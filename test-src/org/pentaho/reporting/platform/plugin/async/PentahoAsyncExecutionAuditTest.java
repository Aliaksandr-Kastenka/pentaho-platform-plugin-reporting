/*
 * This program is free software; you can redistribute it and/or modify it under the
 * terms of the GNU General Public License, version 2 as published by the Free Software
 * Foundation.
 *
 * You should have received a copy of the GNU General Public License along with this
 * program; if not, you can obtain a copy at http://www.gnu.org/licenses/gpl-2.0.html
 * or from the Free Software Foundation, Inc.,
 * 51 Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA.
 *
 * This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY;
 * without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU General Public License for more details.
 *
 *
 * Copyright 2006 - 2016 Pentaho Corporation.  All rights reserved.
 */

package org.pentaho.reporting.platform.plugin.async;

import org.junit.Before;
import org.junit.Test;
import org.mockito.Mockito;
import org.pentaho.platform.api.engine.ILogger;
import org.pentaho.platform.api.engine.IPentahoSession;
import org.pentaho.platform.engine.core.audit.MessageTypes;
import org.pentaho.reporting.engine.classic.core.event.ReportProgressListener;
import org.pentaho.reporting.platform.plugin.AuditWrapper;
import org.pentaho.reporting.platform.plugin.SimpleReportingComponent;
import org.pentaho.reporting.platform.plugin.staging.AsyncJobFileStagingHandler;

import java.util.Collections;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;

import static junit.framework.Assert.assertEquals;
import static org.mockito.Matchers.anyFloat;
import static org.mockito.Matchers.eq;
import static org.mockito.Mockito.*;

public class PentahoAsyncExecutionAuditTest {

  public static final String url = "junit url";
  private static final String auditId = "auditId";
  public static final String sessionId = "sessionId";
  private static final String sessionName = "junitName";

  public static final UUID uuid = UUID.randomUUID();

  private SimpleReportingComponent component = mock( SimpleReportingComponent.class );
  private AsyncJobFileStagingHandler handler = mock( AsyncJobFileStagingHandler.class );
  IPentahoSession session = mock( IPentahoSession.class );
  private AuditWrapper wrapper = mock( AuditWrapper.class );

  @Before
  public void before() {
    when( session.getId() ).thenReturn( sessionId );
    when( session.getName() ).thenReturn( sessionName );
  }

  @Test
  public void testSuccessExecutionAudit() throws Exception {
    final PentahoAsyncReportExecution execution =
      new PentahoAsyncReportExecution( url, component, handler, session, auditId, wrapper );
    execution.notifyTaskQueued( uuid, Collections.<ReportProgressListener>emptyList() );

    //this is successful story
    when( component.execute() ).thenReturn( true );

    execution.call();

    verify( wrapper, Mockito.times( 1 ) ).audit(
      eq( sessionId ),
      eq( sessionName ),
      eq( url ),
      eq( execution.getClass().getName() ),
      eq( execution.getClass().getName() ),
      eq( MessageTypes.INSTANCE_START ),
      eq( auditId ),
      eq( "" ),
      eq( (float) 0 ),
      any( ILogger.class )
    );

    verify( wrapper, Mockito.times( 1 ) ).audit(
      eq( sessionId ),
      eq( sessionName ),
      eq( url ),
      eq( execution.getClass().getName() ),
      eq( execution.getClass().getName() ),
      eq( MessageTypes.INSTANCE_END ),
      eq( auditId ),
      eq( "" ),
      anyFloat(), // hope more than 0
      any( ILogger.class )
    );
  }

  @Test
  public void testFailedExecutionAudit() throws Exception {
    final PentahoAsyncReportExecution execution =
      new PentahoAsyncReportExecution( url, component, handler, session, auditId, wrapper );
    execution.notifyTaskQueued( uuid, Collections.<ReportProgressListener>emptyList() );

    //this is sad story
    when( component.execute() ).thenReturn( false );

    execution.call();

    // we always log instance start for every execution attempt
    verify( wrapper, Mockito.times( 1 ) ).audit(
      eq( sessionId ),
      eq( sessionName ),
      eq( url ),
      eq( execution.getClass().getName() ),
      eq( execution.getClass().getName() ),
      eq( MessageTypes.INSTANCE_START ),
      eq( auditId ),
      eq( "" ),
      eq( (float) 0 ),
      any( ILogger.class )
    );

    // no async reports for this case.
    verify( wrapper, Mockito.times( 1 ) ).audit(
      eq( sessionId ),
      eq( sessionName ),
      eq( url ),
      eq( execution.getClass().getName() ),
      eq( execution.getClass().getName() ),
      eq( MessageTypes.FAILED ),
      eq( auditId ),
      eq( "" ),
      eq( (float) 0 ),
      any( ILogger.class )
    );
  }

  /**
   * We need a special wrapper that will be able to get id from one thread (created for report execution) and made this
   * value accessible in contest of this junit test thread.
   *
   * @throws Exception
   */
  @Test
  @SuppressWarnings( "unchecked" )
  public void testInstanceIdIsSet() throws Exception {

    final CountDownLatch latch = new CountDownLatch( 1 );
    final ThreadSpyAuditWrapper wrapper = new ThreadSpyAuditWrapper( latch );

    final String expected = UUID.randomUUID().toString();

    final PentahoAsyncReportExecution execution =
      new PentahoAsyncReportExecution( url, component, handler, session, expected, wrapper );

    final PentahoAsyncExecutor executor = new PentahoAsyncExecutor( 2 );
    executor.addTask( execution, session );

    latch.await();
    synchronized ( latch ) {
      assertEquals( expected, wrapper.capturedId );
    }
  }

  private static class ThreadSpyAuditWrapper extends AuditWrapper {

    volatile String capturedId;
    private final CountDownLatch latch;

    ThreadSpyAuditWrapper( final CountDownLatch latch ) {
      this.latch = latch;
    }

    @Override
    public void audit( final String instanceId, final String userId, final String actionName, final String objectType,
                       final String processId, final String messageType, final String message, final String value,
                       final float duration,
                       final ILogger logger ) {
      synchronized ( latch ) {
        latch.countDown();
        capturedId = ReportListenerThreadHolder.getRequestId();
      }

    }
  }
}
