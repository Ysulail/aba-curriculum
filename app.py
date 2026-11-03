#!/usr/bin/env python3
import aws_cdk as cdk
from hr_leave_portal.backend_stack import BackendStack
from hr_leave_portal.notification_stack import NotificationStack
from hr_leave_portal.state_machine_stack import StateMachineStack

app = cdk.App()

notifications = NotificationStack(app, "HrLeavePortalNotifications")
backend = BackendStack(app, "HrLeavePortalBackend")

state_machine = StateMachineStack(
    app,
    "HrLeavePortalStateMachine",
    hr_email_topic=notifications.hr_email_topic,
    api_function=backend.api_function
)

app.synth()