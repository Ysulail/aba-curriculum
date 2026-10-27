#!/usr/bin/env python3

import aws_cdk as cdk

from hr_leave_portal.hr_leave_portal_stack import HrLeavePortalStack


app = cdk.App()
HrLeavePortalStack(app, "HrLeavePortalStack")

app.synth()
