#!/usr/bin/env python3
import aws_cdk as cdk
from hr_leave_portal.agent_runtime_stack import AgentRuntimeStack
from hr_leave_portal.backend_stack import BackendStack
from hr_leave_portal.notification_stack import NotificationStack
from hr_leave_portal.state_machine_stack import StateMachineStack
from hr_leave_portal.ui_stack import UiStack

app = cdk.App()

notifications = NotificationStack(app, "HrLeavePortalNotifications")

backend = BackendStack(app, "HrLeavePortalBackend")

StateMachineStack(
    app,
    "HrLeavePortalStateMachine",
    hr_email_topic=notifications.hr_email_topic,
    api_function=backend.api_function
)

agent = AgentRuntimeStack(
    app,
    "HrLeavePortalAgentRuntime",
    table=backend.table,
    hr_email_topic=notifications.hr_email_topic,
    user_pool=backend.user_pool,
    user_pool_client=backend.user_pool_client
)

UiStack(
    app,
    "HrLeavePortalUi",
    user_pool_id=backend.user_pool.user_pool_id,
    user_pool_client_id=backend.user_pool_client.user_pool_client_id,
    api_url=backend.api.url,
    agent_runtime_arn=agent.agent_runtime.agent_runtime_arn,
)

app.synth()
