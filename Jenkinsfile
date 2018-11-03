def mvnCmd = "mvn -s ./nexus_openshift_settings.xml"

def getAvg() {
    def result = sh (
        script: 'grep "summary =" ./target/jmeter/logs/pessoas.jmx.log | awk \'{ print \$11}\' | tr -d \'/s\' | cut -d. -f1',
        returnStdout: true
    ).trim()
    echo "media = ${result}"
    return result.toInteger();
}

def getVersionFromPom(pom) {
  def matcher = readFile(pom) =~ '<version>(.+)</version>'
  matcher ? matcher[0][1] : null
}

def dest   = "rhdemo-green"
def active = ""


pipeline {
  agent {
    label 'maven'
  }
  stages {
    stage('Checkout Source') {
      steps {
        echo "Checkout"
        checkout scm
      }
    }

    stage('Unit Test') {
      steps {
        sh "${mvnCmd} test"
      }
    }
    stage('Code Analysis') {
      steps {
        script {
          sh "${mvnCmd} sonar:sonar -Dsonar.host.url=http://sonarqube:9000 -DskipTests=true"
        }
      }
    }

    stage('Build jar') {
      steps {
        script {
          def version = getVersionFromPom("pom.xml")
          echo "Building version ${version}"
          sh "${mvnCmd} clean package -DskipTests"
        }
      }
    }

    stage('Publish to Nexus') {
      steps {
        sh "${mvnCmd} deploy -DskipTests=true -DaltDeploymentRepository=nexus::default::http://nexus.cicd.svc.cluster.local:8081/repository/maven-releases"
        echo "Publish to Nexus"
      }
    }

    stage('Build OpenShift Image') {
      steps {
        script {
          def version = getVersionFromPom("pom.xml")
          def newTag = "TestingCandidate-${version}"
          echo "New Tag: ${newTag}"
          sh "mkdir -p ./builddir/deployments"
          sh "cp ./target/rhdemo-swarm.jar ./builddir/deployments"
          //sh "oc policy add-role-to-user edit system:serviceaccount:cicd:jenkins -n rhdemo-app-dev"
          sh "oc new-build --image-stream=redhat-openjdk18-openshift:1.3 --binary=true --name rhdemo -n rhdemo-app-dev || echo 'Build já existe'"
          sh "oc start-build rhdemo --follow --from-dir=./builddir/. -n rhdemo-app-dev"

          openshiftTag alias: 'false', destStream: 'rhdemo', destTag: newTag, destinationNamespace: 'rhdemo-app-dev', namespace: 'rhdemo-app-dev', srcStream: 'rhdemo', srcTag: 'latest', verbose: 'false'
        }
      }
    }

    stage('Deploy to Dev') {
      steps{
        script {
          def version = getVersionFromPom("pom.xml")
          sh "oc new-app rhdemo-app-dev/rhdemo:TestingCandidate-$version --name=rhdemo --allow-missing-imagestream-tags=true -n rhdemo-app-dev || echo 'app já existe'"
          sh "oc set env dc/rhdemo JAVA_OPTIONS=\"-Djava.net.preferIPv4Stack=true -Djava.net.preferIPv4Addresses=true\" -n rhdemo-app-dev"
          sh "oc set env dc/rhdemo GC_MAX_METASPACE_SIZE=\"512\" -n rhdemo-app-dev"
          sh "oc patch dc rhdemo --patch '{\"spec\": { \"triggers\": [ { \"type\": \"ImageChange\", \"imageChangeParams\": { \"containerNames\": [ \"rhdemo\" ], \"from\": { \"kind\": \"ImageStreamTag\", \"namespace\": \"rhdemo-app-dev\", \"name\": \"rhdemo:TestingCandidate-$version\"}}}]}}' -n rhdemo-app-dev"
          sh "oc set triggers dc/rhdemo --remove-all -n rhdemo-app-dev"
          sh "oc expose dc rhdemo --port 8080 -n rhdemo-app-dev || echo 'svc já existe'"
          sh "oc expose svc rhdemo -n rhdemo-app-dev || echo 'route já existe'"
          //openshiftDeploy depCfg: 'rhdemo', namespace: 'rhdemo-app-dev', verbose: 'false', waitTime: '', waitUnit: 'sec'
          openshiftVerifyDeployment depCfg: 'rhdemo', namespace: 'rhdemo-app-dev', replicaCount: '1', verbose: 'false', verifyReplicaCount: 'false', waitTime: '', waitUnit: 'sec'
          openshiftVerifyService namespace: 'rhdemo-app-dev', svcName: 'rhdemo', verbose: 'false'
        }
      }
    }

    stage('Integration Test') {
      steps{
        script {
          def version = getVersionFromPom("pom.xml")
          def newTag = "ProdReady-${version}"
          echo "New Tag: ${newTag}"

          openshiftTag alias: 'false', destStream: 'rhdemo', destTag: newTag, destinationNamespace: 'rhdemo-app-dev', namespace: 'rhdemo-app-dev', srcStream: 'rhdemo', srcTag: 'latest', verbose: 'false'

          timeout(120) {
                waitUntil {

                    def r = sh (
                        script: 'curl -I -s http://rhdemo-rhdemo-app-dev.192.168.42.196.nip.io/rest/pessoas | head -n 1 |cut -d$\' \' -f2',
                        returnStdout: true
                    ).trim()
                    return r.toInteger().equals(200);
                }
          }

          sh "${mvnCmd} com.restlet.dhc:dhc-maven-plugin:1.4.2.2:test@default-cli"
        }
      }
    }

    stage('Preparation for Prod Deploy') {
      steps {
        script {
          //sh "oc policy add-role-to-group system:image-puller system:serviceaccounts:rhdemo-app-prod -n rhdemo-app-dev"
          //sh "oc policy add-role-to-user edit system:serviceaccount:cicd:jenkins -n rhdemo-app-prod"
          sh "oc new-app rhdemo-app-dev/rhdemo:ProdReady-1.0 --name=rhdemo-green --allow-missing-imagestream-tags=true -n rhdemo-app-prod || echo 'app já existe'"
          sh "oc new-app rhdemo-app-dev/rhdemo:ProdReady-1.0 --name=rhdemo-blue --allow-missing-imagestream-tags=true -n rhdemo-app-prod || echo 'app já existe'"
          sh "oc set env dc/rhdemo-green JAVA_OPTIONS=\"-Djava.net.preferIPv4Stack=true -Djava.net.preferIPv4Addresses=true\" -n rhdemo-app-prod"
          sh "oc set env dc/rhdemo-green GC_MAX_METASPACE_SIZE=\"512\" -n rhdemo-app-prod"
          sh "oc set env dc/rhdemo-blue JAVA_OPTIONS=\"-Djava.net.preferIPv4Stack=true -Djava.net.preferIPv4Addresses=true\" -n rhdemo-app-prod"
          sh "oc set env dc/rhdemo-blue GC_MAX_METASPACE_SIZE=\"512\" -n rhdemo-app-prod"

          sh "oc set resources dc/rhdemo-green --limits=cpu='1000m',memory='750Mi' --requests=cpu='250m',memory='200Mi' -n rhdemo-app-prod || echo 'Limit e CPUs já definidos!'"
          sh "oc set resources dc/rhdemo-blue --limits=cpu='1000m',memory='750Mi' --requests=cpu='250m',memory='200Mi' -n rhdemo-app-prod || echo 'Limit e CPUs já definidos!'"
          sh "oc set probe dc rhdemo-green --readiness --initial-delay-seconds=1 --timeout-seconds=10 --get-url=http://:8080/node -n rhdemo-app-prod || echo 'Readiness check já existe para o sistema!'"
          sh "oc set probe dc rhdemo-blue --readiness --initial-delay-seconds=1 --timeout-seconds=10 --get-url=http://:8080/node -n rhdemo-app-prod || echo 'Readiness check já existe para o sistema!'"
          sh "oc set probe dc rhdemo-green --liveness --initial-delay-seconds=120 --timeout-seconds=10 --get-url=http://:8080/node -n rhdemo-app-prod || echo 'Liveness check já existe para o sistema!'"
          sh "oc set probe dc rhdemo-blue --liveness --initial-delay-seconds=120 --timeout-seconds=10 --get-url=http://:8080/node -n rhdemo-app-prod || echo 'Liveness check já existe para o sistema!'"
          sh "oc autoscale dc rhdemo-blue --cpu-percent=90 --min=1 --max=5 -n rhdemo-app-prod || echo 'Autoscaler já existe!'"
          sh "oc autoscale dc rhdemo-green --cpu-percent=90 --min=1 --max=5 -n rhdemo-app-prod || echo 'Autoscaler já existe!'"

          sh "oc set triggers dc/rhdemo-green --remove-all -n rhdemo-app-prod"
          sh "oc set triggers dc/rhdemo-blue --remove-all -n rhdemo-app-prod"
          sh "oc expose dc rhdemo-blue --port 8080 -n rhdemo-app-prod || echo 'svc já existe'"
          sh "oc expose dc rhdemo-green --port 8080 -n rhdemo-app-prod || echo 'svc já existe'"
          sh "oc expose svc/rhdemo-green --name rhdemo -n rhdemo-app-prod || echo 'route já existe'"

          sh "oc get route rhdemo -n rhdemo-app-prod -o jsonpath='{ .spec.to.name }' > activesvc.txt"
          active = readFile('activesvc.txt').trim()
          if (active == "rhdemo-green") {
            dest = "rhdemo-blue"
          }
          echo "Active svc: " + active
          echo "Dest svc:   " + dest
        }
      }
    }

    stage('Deploy to Prod') {
      steps {
        script {
          def version = getVersionFromPom("pom.xml")
          echo "Deploying to ${dest}"

          sh "oc patch dc ${dest} --patch '{\"spec\": { \"triggers\": [ { \"type\": \"ImageChange\", \"imageChangeParams\": { \"containerNames\": [ \"$dest\" ], \"from\": { \"kind\": \"ImageStreamTag\", \"namespace\": \"rhdemo-app-dev\", \"name\": \"rhdemo:ProdReady-$version\"}}}]}}' -n rhdemo-app-prod"

          sh "oc expose service ${dest} -n rhdemo-app-prod || echo 'Rota já existe'"

          openshiftDeploy depCfg: dest, namespace: 'rhdemo-app-prod', verbose: 'false', waitTime: '', waitUnit: 'sec'
          openshiftVerifyDeployment depCfg: dest, namespace: 'rhdemo-app-prod', replicaCount: '1', verbose: 'false', verifyReplicaCount: 'true', waitTime: '', waitUnit: 'sec'
          openshiftVerifyService namespace: 'rhdemo-app-prod', svcName: dest, verbose: 'false'
        }
      }
    }

    stage('Performance test') {
      steps {
        script {
          sh "${mvnCmd} jmeter:jmeter"

          if(getAvg() < 100){
             input "Switch to Production even with poor performance?"
          }
        }
      }
    }

    stage('Switch over to new Version') {
      steps{
        script {
          sh 'oc patch route rhdemo -n rhdemo-app-prod -p \'{"spec":{"to":{"name":"' + dest + '"}}}\''
          sh 'oc get route rhdemo -n rhdemo-app-prod > oc_out.txt'
          oc_out = readFile('oc_out.txt')
          echo "Current route configuration: " + oc_out
        }
      }
    }
  }
}
