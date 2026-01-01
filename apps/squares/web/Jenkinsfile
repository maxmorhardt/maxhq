pipeline {
	agent {
		kubernetes {
			inheritFrom 'default'
			defaultContainer 'buildpack'
		}
	}

	options {
		timeout(time: 30, unit: 'MINUTES')
		buildDiscarder(logRotator(numToKeepStr: '5'))
	}

	parameters {
		string(name: 'DOCKER_VERSION', defaultValue: params.DOCKER_VERSION ?: '0.0.1', description: 'Docker image version', trim: true)
		string(name: 'HELM_VERSION', defaultValue: params.HELM_VERSION ?: '0.0.1', description: 'Helm chart version', trim: true)
	}


	environment {
		GITHUB_URL = 'https://github.com/maxmorhardt/squares'

		DOCKER_REGISTRY = 'docker.io'
		DOCKER_REGISTRY_FULL = "oci://${env.DOCKER_REGISTRY}"
		DOCKER = credentials('docker')

		APP_NAME = "squares"
		CHART_NAME = "$APP_NAME-chart"
		NAMESPACE = "squares"
	}

	stages {
		stage('Setup') {
			steps {
				script {
					checkout scmGit(
						branches: [[
							name: "$BRANCH_NAME"
						]],
						userRemoteConfigs: [[
							credentialsId: 'github',
							url: "$GITHUB_URL"
						]]
					)

					sh "ls -lah"
				}
			}
		}

		stage('Test') {
			steps {
				script {
					sh """
						npm ci
						npm run test -- --run --coverage
					"""
				}
			}

			post {
				always {
					publishHTML([
						allowMissing: false,
						alwaysLinkToLastBuild: true,
						keepAll: true,
						reportDir: 'coverage',
						reportFiles: 'index.html',
						reportName: 'Test Coverage Report'
					])
				}
			}
		}

		stage('Build') {
			steps {
				script {
					sh """
						npm run build

						ls -lah dist
					"""
				}
			}
		}

		stage('Docker CI') {
			steps {
				container('dind') {
					script {
						sh 'echo $DOCKER_PSW | docker login -u $DOCKER_USR --password-stdin'

						sh """
							docker buildx build --push \
								--platform linux/arm64/v8 \
								--tag ${DOCKER_USR}/${APP_NAME}:$DOCKER_VERSION \
								--tag ${DOCKER_USR}/${APP_NAME}:latest \
								.
						"""
					}
				}
			}
		}

		stage('Image Scan') {
			steps {
				container('dind') {
					script {
						sh """
							echo "Scanning image for vulnerabilities..."
							
							docker run --rm \
								-v /var/run/docker.sock:/var/run/docker.sock \
								aquasec/trivy:latest image \
								--severity HIGH,CRITICAL \
								--exit-code 1 \
								${DOCKER_USR}/${APP_NAME}:$DOCKER_VERSION
						"""
					}
				}
			}
		}

		stage('Helm CI') {
			steps {
				dir('helm') {
					script {
						sh '''
							echo "$DOCKER_PSW" | helm registry login $DOCKER_REGISTRY \
								--username $DOCKER_USR --password-stdin 2>/dev/null

							helm package $APP_NAME --app-version=$DOCKER_VERSION --version=$HELM_VERSION
							helm push ./$CHART_NAME-${HELM_VERSION}.tgz $DOCKER_REGISTRY_FULL/$DOCKER_USR
						'''
					}
				}
			}
		}

		stage('CD') {
			steps {
				script {
					withCredentials([file(credentialsId: 'kube-config', variable: 'KUBECONFIG')]) {
						sh """							
							helm upgrade $APP_NAME $DOCKER_REGISTRY_FULL/$DOCKER_USR/$CHART_NAME \
								--version $HELM_VERSION \
								--install \
								--atomic \
								--timeout 5m \
								--debug \
								--history-max=3 \
								--namespace $NAMESPACE \
								--set image.tag=$DOCKER_VERSION
						"""
					}
				}
			}
		}
	}
}