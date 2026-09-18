from django.shortcuts import render

# Create your views here.

from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status


@api_view(["GET"])
def health_check(request):
    return Response(
        {
            "status": "ok",
            "service": "VaultDrive API"
        },
        status=status.HTTP_200_OK
    )